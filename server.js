
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { PDFDocument } = require('pdf-lib');

const app = express();
const PORT = Number(process.env.PORT || 5000);
const JWT_SECRET = process.env.JWT_SECRET;
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!JWT_SECRET) console.warn('WARNING: JWT_SECRET is missing. Create a .env file before using this server.');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  frameguard: false,
  contentSecurityPolicy: false
}));
app.use(cors({ origin: process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(',') : 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(UPLOAD_DIR, { dotfiles: 'deny', index: false }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Please try again later.' } });
const emailPattern = /^\S+@\S+\.\S+$/;

function getEmailTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
    auth: { user, pass }
  });
}

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true, minlength: 2, maxlength: 40 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  password: { type: String, required: true, minlength: 8, select: false },
  securityQuestion: { type: String, default: "What is your favorite color?" },
  securityAnswer: { type: String, select: false }
}, { timestamps: true });
const User = mongoose.model('User', userSchema);

const noteSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 1500, default: '' },
  subject: { type: String, trim: true, maxlength: 60, default: 'General' },
  filePath: { type: String, required: true },
  originalFileName: { type: String, required: true },
  fileSize: { type: Number, default: 0 },
  mimeType: { type: String, default: 'application/octet-stream' },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  uploaderName: { type: String, required: true },
  downloads: { type: Number, default: 0 }
}, { timestamps: true });
noteSchema.index({ createdAt: -1 });
noteSchema.index({ subject: 1, createdAt: -1 });
noteSchema.index({ uploadedBy: 1, createdAt: -1 });
noteSchema.index({ title: 'text', description: 'text', subject: 'text' });
const Note = mongoose.model('Note', noteSchema);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = /^\.[a-z0-9]{1,10}$/.test(ext) ? ext : '';
    cb(null, `${Date.now()}-${require('crypto').randomBytes(8).toString('hex')}${safeExt}`);
  }
});
const allowedMime = new Set([
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'application/zip'
]);
const upload = multer({ storage, limits: { fileSize: Math.max(1, Number(process.env.MAX_FILE_SIZE_MB || 10)) * 1024 * 1024 }, fileFilter: (_req, file, cb) => {
  if (allowedMime.has(file.mimetype)) return cb(null, true);
  cb(new Error('Unsupported file type. Upload PDF, DOC/DOCX, PPT/PPTX, XLS/XLSX, TXT or ZIP files.'));
} });

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Please log in to continue.' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch (_err) { return res.status(401).json({ error: 'Your session has expired. Please log in again.' }); }
}
function asyncRoute(fn) { return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next); }
function cleanNote(note) {
  const n = note.toObject ? note.toObject() : note;
  return { ...n, fileUrl: `/uploads/${encodeURIComponent(path.basename(n.filePath || ''))}` };
}
function deleteFile(filePath) {
  if (!filePath) return;
  const absolute = path.join(UPLOAD_DIR, path.basename(filePath));
  if (absolute.startsWith(UPLOAD_DIR) && fs.existsSync(absolute)) fs.unlink(absolute, () => {});
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'Student Notes Sharing API' }));
app.post('/api/auth/register', authLimiter, asyncRoute(async (req, res) => {
  let { username, email, password, securityQuestion, securityAnswer } = req.body || {};
  username = String(username || '').trim(); email = String(email || '').trim().toLowerCase();
  if (username.length < 2 || username.length > 40) return res.status(400).json({ error: 'Username must be between 2 and 40 characters.' });
  if (!emailPattern.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (typeof password !== 'string' || password.length < 8 || password.length > 72) return res.status(400).json({ error: 'Password must be 8–72 characters long.' });
  if (await User.exists({ email })) return res.status(409).json({ error: 'An account with this email already exists.' });

  const q = String(securityQuestion || "What is your favorite color?").trim().slice(0, 150);
  const a = String(securityAnswer || '').trim().toLowerCase();
  if (!a) {
    return res.status(400).json({ error: 'Please provide an answer to your security question.' });
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const hashedAnswer = await bcrypt.hash(a, 10);

  const user = await User.create({
    username,
    email,
    password: hashedPassword,
    securityQuestion: q,
    securityAnswer: hashedAnswer
  });
  res.status(201).json({ message: 'Account created successfully.', user: { id: user._id, username: user.username, email: user.email } });
}));
app.post('/api/auth/login', authLimiter, asyncRoute(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = req.body?.password;
  if (!emailPattern.test(email) || typeof password !== 'string') return res.status(400).json({ error: 'Enter your email and password.' });
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: 'Incorrect email or password.' });
  if (!JWT_SECRET) return res.status(500).json({ error: 'Server authentication is not configured. Add JWT_SECRET to .env.' });
  const token = jwt.sign({ id: user._id.toString(), username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ message: 'Login successful.', token, user: { id: user._id, username: user.username, email: user.email } });
}));

// Step 1: Lookup registered user and return their security question
app.post('/api/auth/get-security-question', authLimiter, asyncRoute(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!emailPattern.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ error: 'No account found with this email address.' });
  }

  res.json({
    email: user.email,
    securityQuestion: user.securityQuestion || "What is your favorite color?"
  });
}));

// Step 2: Verify security answer and reset password
app.post('/api/auth/reset-password-security', authLimiter, asyncRoute(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const securityAnswer = String(req.body?.securityAnswer || '').trim().toLowerCase();
  const newPassword = req.body?.newPassword;

  if (!emailPattern.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (!securityAnswer) return res.status(400).json({ error: 'Please answer your security question.' });
  if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 72) {
    return res.status(400).json({ error: 'New password must be between 8 and 72 characters long.' });
  }

  const user = await User.findOne({ email }).select('+securityAnswer');
  if (!user) {
    return res.status(404).json({ error: 'No account found with this email address.' });
  }

  // If user registered before security question was required, allow reset or check match
  if (user.securityAnswer) {
    const isAnswerCorrect = await bcrypt.compare(securityAnswer, user.securityAnswer);
    if (!isAnswerCorrect) {
      return res.status(400).json({ error: 'Incorrect answer to the security question.' });
    }
  }

  user.password = await bcrypt.hash(newPassword, 12);
  await user.save();

  res.json({ message: 'Password reset successfully! You can now log in with your new password.' });
}));
app.get('/api/auth/me', auth, asyncRoute(async (req, res) => {
  const user = await User.findById(req.user.id).select('username email createdAt');
  if (!user) return res.status(404).json({ error: 'User account not found.' });
  res.json({ user: { id: user._id, username: user.username, email: user.email, createdAt: user.createdAt } });
}));
app.delete('/api/auth/me', auth, asyncRoute(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User account not found.' });
  const notes = await Note.find({ uploadedBy: req.user.id });
  for (const note of notes) {
    deleteFile(note.filePath);
  }
  await Note.deleteMany({ uploadedBy: req.user.id });
  await User.findByIdAndDelete(req.user.id);
  res.json({ message: 'Account deleted successfully.' });
}));

app.get('/api/notes', asyncRoute(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(24, Math.max(1, Number.parseInt(req.query.limit, 10) || 12));
  const search = String(req.query.search || '').trim().slice(0, 100);
  const subject = String(req.query.subject || '').trim().slice(0, 60);
  const filter = {};
  if (search) filter.$or = [
    { title: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
    { description: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
    { subject: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }
  ];
  if (subject && subject !== 'All subjects') filter.subject = subject;
  const [notes, total] = await Promise.all([
    Note.find(filter)
      .select('title description subject filePath originalFileName fileSize mimeType uploadedBy uploaderName downloads createdAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Note.countDocuments(filter)
  ]);
  res.json({ notes: notes.map(cleanNote), total, page, pages: Math.max(1, Math.ceil(total / limit)) });
}));
app.get('/api/notes/mine', auth, asyncRoute(async (req, res) => {
  const notes = await Note.find({ uploadedBy: req.user.id }).sort({ createdAt: -1 });
  res.json({ notes: notes.map(cleanNote) });
}));
app.post('/api/notes', auth, upload.single('file'), asyncRoute(async (req, res) => {
  const title = String(req.body.title || '').trim();
  const description = String(req.body.description || '').trim();
  const subject = String(req.body.subject || 'General').trim() || 'General';
  if (!title || title.length > 120) { if (req.file) deleteFile(req.file.filename); return res.status(400).json({ error: 'Title is required and must be 120 characters or fewer.' }); }
  if (!req.file) return res.status(400).json({ error: 'Please select a file to upload.' });
  const note = await Note.create({ title, description, subject, filePath: req.file.filename, originalFileName: path.basename(req.file.originalname).slice(0, 200), fileSize: req.file.size, mimeType: req.file.mimetype, uploadedBy: req.user.id, uploaderName: req.user.username });
  res.status(201).json({ message: 'Note uploaded successfully.', note: cleanNote(note) });
}));
app.put('/api/notes/:id', auth, upload.single('file'), asyncRoute(async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) { if (req.file) deleteFile(req.file.filename); return res.status(404).json({ error: 'Note not found.' }); }
  if (note.uploadedBy.toString() !== req.user.id) { if (req.file) deleteFile(req.file.filename); return res.status(403).json({ error: 'You can only edit notes you uploaded.' }); }
  if (req.body.title !== undefined) { const title = String(req.body.title).trim(); if (!title || title.length > 120) return res.status(400).json({ error: 'Title is required and must be 120 characters or fewer.' }); note.title = title; }
  if (req.body.description !== undefined) note.description = String(req.body.description).trim().slice(0, 1500);
  if (req.body.subject !== undefined) note.subject = String(req.body.subject).trim().slice(0, 60) || 'General';
  if (req.file) { deleteFile(note.filePath); note.filePath = req.file.filename; note.originalFileName = path.basename(req.file.originalname).slice(0, 200); note.fileSize = req.file.size; note.mimeType = req.file.mimetype; }
  await note.save(); res.json({ message: 'Note updated successfully.', note: cleanNote(note) });
}));
app.delete('/api/notes/:id', auth, asyncRoute(async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) return res.status(404).json({ error: 'Note not found.' });
  if (note.uploadedBy.toString() !== req.user.id) return res.status(403).json({ error: 'You can only delete notes you uploaded.' });
  deleteFile(note.filePath); await note.deleteOne(); res.json({ message: 'Note deleted successfully.' });
}));
app.get('/api/notes/:id/preview', asyncRoute(async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) return res.status(404).json({ error: 'Note not found.' });
  const absolute = path.join(UPLOAD_DIR, path.basename(note.filePath));
  if (!fs.existsSync(absolute)) return res.status(404).json({ error: 'The uploaded file is no longer available.' });

  if (note.mimeType) res.setHeader('Content-Type', note.mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(note.originalFileName)}"`);
  res.sendFile(absolute);
}));
app.get('/api/notes/:id/download', asyncRoute(async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) return res.status(404).json({ error: 'Note not found.' });
  const absolute = path.join(UPLOAD_DIR, path.basename(note.filePath));
  if (!fs.existsSync(absolute)) return res.status(404).json({ error: 'The uploaded file is no longer available.' });
  note.downloads += 1; await note.save();
  res.download(absolute, note.originalFileName);
}));
app.use((err, _req, res, _next) => {
  console.error(err.message || err);
  if (err instanceof multer.MulterError) return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? `File is too large. Maximum size is ${process.env.MAX_FILE_SIZE_MB || 10} MB.` : err.message });
  if (err.message && err.message.startsWith('Unsupported file type')) return res.status(400).json({ error: err.message });
  if (err.code === 11000) return res.status(409).json({ error: 'An account with this email already exists.' });
  if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid ID.' });
  res.status(500).json({ error: 'Something went wrong on the server. Please try again.' });
});

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/student_notes_sharing')
  .then(() => { console.log('MongoDB connected'); app.listen(PORT, () => console.log(`API running at http://localhost:${PORT}`)); })
  .catch(err => { console.error('Could not connect to MongoDB:', err.message); process.exit(1); });
