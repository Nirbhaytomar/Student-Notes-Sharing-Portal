# DigiBal — Student Notes Sharing (MERN)

A refreshed student resource-sharing app with a responsive library, search and subject filters, pagination, authentication, upload/edit/delete, download tracking, and owner-only note management.

## Requirements
- Node.js 18+
- MongoDB local service or a MongoDB Atlas cluster

## 1. Configure the backend
From the project root (same folder as `server.js`):

```bash
npm install
````
Copy `.env.example` to `.env` and set your own values:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/student_notes_sharing
JWT_SECRET=use_a_long_random_secret_here
CLIENT_ORIGIN=http://localhost:5173
MAX_FILE_SIZE_MB=10
```

If using MongoDB Atlas, replace `MONGODB_URI` with your Atlas connection string and replace `<db_password>` with the database user's password. Do not share or commit `.env`. Add your current IP to Atlas Network Access and make sure the database user has the required permissions.

Start the API: `npm run dev` (or `npm start`). It listens on port 5000 after MongoDB connects. Health check: `http://localhost:5000/api/health`.

## 2. Start the frontend
Open a second terminal: `cd app`, then run:

```bash
npm install
````
Copy `app/.env.example` to `app/.env` if the API is not at its default URL. Start the client: `npm run dev`, then open the Vite URL shown (usually `http://localhost:5173`).

## Features
- Responsive dark editorial-style UI
- Browse resources without signing in
- Search by title, description, or subject; subject filters and pagination
- Register and login with hashed passwords and expiring JWTs
- Protected dashboard, upload, edit, and delete endpoints
- Only the uploader can update/delete their notes
- File type allowlist, 10 MB default size limit, safe generated filenames
- Download endpoint records download counts
- Form validation, user-friendly errors, API request timeout, and authentication rate limiting

## Supported uploads
PDF, DOC/DOCX, PPT/PPTX, XLS/XLSX, TXT and ZIP, up to the configured limit.

## Notes
- The original bundled `uploads/` documents were removed from this refreshed ZIP for privacy; the folder is recreated automatically. Upload your own files after setup.
- Uploaded files are stored locally. For production deployment, use persistent disk or object storage and configure the frontend API URL, backend CORS origin, and Atlas network access appropriately.
- This project is a learning starter, not a full production security audit.
