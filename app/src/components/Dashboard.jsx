import { useState, useEffect, useRef, useCallback } from 'react'
import api, { getError, SERVER_BASE } from '../api'
import NotePreviewModal from './NotePreviewModal'

export default function Dashboard() {
  const [notes, setNotes] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [previewNote, setPreviewNote] = useState(null)
  const [openShareId, setOpenShareId] = useState(null)
  const [copiedId, setCopiedId] = useState(null)
  const shareRefs = useRef({})

  // Form state
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('Computer Science')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState(null)
  const [editingId, setEditingId] = useState(null)

  const fileInputRef = useRef(null)

  // Close share dropdown on outside click
  useEffect(() => {
    const handler = e => {
      const anyOpen = Object.values(shareRefs.current).some(el => el && el.contains(e.target))
      if (!anyOpen) setOpenShareId(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleShare = async (note, e) => {
    e.stopPropagation()
    const shareLink = `${SERVER_BASE}/api/notes/${note._id}/download`
    const shareText = `📚 Check out these notes: "${note.title}" — ${note.subject || 'General'}`
    if (navigator.share) {
      try { await navigator.share({ title: note.title, text: shareText, url: shareLink }) } catch (_) {}
      return
    }
    setOpenShareId(prev => prev === note._id ? null : note._id)
  }

  const handleCopyLink = async (note) => {
    const shareLink = `${SERVER_BASE}/api/notes/${note._id}/download`
    try {
      await navigator.clipboard.writeText(shareLink)
      setCopiedId(note._id)
      setTimeout(() => setCopiedId(null), 2200)
    } catch (_) {
      prompt('Copy this link:', shareLink)
    }
  }

  const getShareOptions = note => {
    const shareLink = `${SERVER_BASE}/api/notes/${note._id}/download`
    const shareText = `📚 Check out these notes: "${note.title}" — ${note.subject || 'General'}`
    return [
      { id: 'whatsapp', label: 'WhatsApp', color: '#25D366', href: `https://wa.me/?text=${encodeURIComponent(shareText + '\n' + shareLink)}` },
      { id: 'telegram', label: 'Telegram', color: '#229ED9', href: `https://t.me/share/url?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent(shareText)}` },
      { id: 'twitter', label: 'X', color: '#000', href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareLink)}` },
      { id: 'email', label: 'Email', color: '#EA4335', href: `mailto:?subject=${encodeURIComponent('Study Notes: ' + note.title)}&body=${encodeURIComponent(shareText + '\n\nDownload: ' + shareLink)}` }
    ]
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [notesRes, userRes] = await Promise.all([
        api.get('/notes/mine'),
        api.get('/auth/me')
      ])
      setNotes(notesRes.data.notes || [])
      setUser(userRes.data.user || null)
    } catch (err) {
      setError(getError(err))
      if (err?.response?.status === 401) {
        localStorage.removeItem('token')
        window.location.href = '/login'
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const resetForm = () => {
    setTitle('')
    setSubject('Computer Science')
    setDescription('')
    setFile(null)
    setEditingId(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!editingId && !file) {
      return setError('Please select a file to upload.')
    }

    setSaving(true)
    const formData = new FormData()
    formData.append('title', title)
    formData.append('subject', subject)
    formData.append('description', description)
    if (file) {
      formData.append('file', file)
    }

    try {
      if (editingId) {
        await api.put(`/notes/${editingId}`, formData)
        setSuccess('Notes updated successfully!')
      } else {
        await api.post('/notes', formData)
        setSuccess('Notes uploaded successfully!')
      }
      resetForm()
      fetchData()
    } catch (err) {
      setError(getError(err))
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = note => {
    setEditingId(note._id)
    setTitle(note.title)
    setSubject(note.subject || 'Computer Science')
    setDescription(note.description || '')
    setFile(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async noteId => {
    if (!window.confirm('Are you sure you want to delete this note?')) return
    setError('')
    try {
      await api.delete(`/notes/${noteId}`)
      setNotes(notes.filter(n => n._id !== noteId))
      setSuccess('Note deleted successfully.')
    } catch (err) {
      setError(getError(err))
    }
  }

  const handleDeleteAccount = async () => {
    if (!window.confirm('Warning: This will permanently delete your account and all your uploaded notes. Continue?')) {
      return
    }
    setDeleting(true)
    try {
      await api.delete('/auth/me')
      localStorage.removeItem('token')
      alert('Your account has been deleted.')
      window.location.href = '/'
    } catch (err) {
      setError(getError(err))
      setDeleting(false)
    }
  }

  const formatFileSize = bytes => {
    if (!bytes) return ''
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const totalDownloads = notes.reduce((acc, curr) => acc + (curr.downloads || 0), 0)

  return (
    <div className="dashboard-container">
      {/* Top Banner & Stats */}
      <div className="dashboard-header-card">
        <div className="user-greeting-meta">
          <div className="user-big-avatar">
            {(user?.username || 'U')[0].toUpperCase()}
          </div>
          <div>
            <h2>Hello, {user?.username || 'Student'}! 👋</h2>
            <p>{user?.email} • Member since {user?.createdAt ? new Date(user.createdAt).getFullYear() : '2025'}</p>
          </div>
        </div>

        <div className="dashboard-stat-chips">
          <div className="stat-chip">
            <span className="stat-chip-label">My Uploads</span>
            <span className="stat-chip-num">{notes.length}</span>
          </div>
          <div className="stat-chip">
            <span className="stat-chip-label">Total Downloads</span>
            <span className="stat-chip-num">{totalDownloads}</span>
          </div>
        </div>
      </div>

      {error && <div className="alert-box alert-danger">{error}</div>}
      {success && <div className="alert-box alert-success">{success}</div>}

      <div className="dashboard-layout-row">
        {/* Left Column: Form */}
        <div className="dashboard-form-col">
          <div className="panel-card">
            <div className="panel-header">
              <div className="panel-icon">
                {editingId ? '✏️' : '📤'}
              </div>
              <div>
                <h3>{editingId ? 'Edit Resource' : 'Upload New Notes'}</h3>
                <p>{editingId ? 'Update details or replace file' : 'Share with college students'}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="modern-form">
              <div className="form-field">
                <label>Resource Title *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Data Structures & Algorithms - Unit 1"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  maxLength={120}
                  required
                />
              </div>

              <div className="form-field">
                <label>Subject Category</label>
                <select 
                  className="form-input form-select" 
                  value={subject} 
                  onChange={e => setSubject(e.target.value)}
                >
                  <option value="Computer Science">Computer Science</option>
                  <option value="Programming">Programming</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Mechanical">Mechanical</option>
                  <option value="Business & Economics">Business & Economics</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-field">
                <label>Brief Description</label>
                <textarea
                  className="form-input form-textarea"
                  rows="3"
                  placeholder="Mention topics covered, syllabus unit, or exam tips..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  maxLength={1500}
                />
              </div>

              <div className="form-field">
                <label>Select Document {editingId ? '(Optional)' : '*'}</label>
                <div className="custom-file-upload">
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="file-upload"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip"
                    onChange={e => setFile(e.target.files[0] || null)}
                    required={!editingId}
                  />
                  <label htmlFor="file-upload" className="file-upload-label">
                    <span className="upload-arrow-icon">📄</span>
                    <span className="file-name-text">
                      {file ? file.name : editingId ? 'Choose new file to replace existing' : 'Click to browse notes file'}
                    </span>
                    <small className="file-support-text">
                      {file ? `${formatFileSize(file.size)} • Ready` : 'PDF, Word, PPT, Excel, TXT or ZIP (Max 10MB)'}
                    </small>
                  </label>
                </div>
              </div>

              <div className="form-btn-group">
                <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
                  {saving ? 'Processing...' : editingId ? 'Save Changes' : 'Publish to Library'}
                </button>
                {editingId && (
                  <button type="button" className="btn btn-secondary btn-block" onClick={resetForm}>
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Uploaded List */}
        <div className="dashboard-list-col">
          <div className="panel-card">
            <div className="panel-header">
              <div className="panel-icon">📚</div>
              <div>
                <h3>My Shared Materials</h3>
                <p>Manage documents you have contributed</p>
              </div>
            </div>

            {loading ? (
              <div className="panel-loading">Loading your files...</div>
            ) : notes.length > 0 ? (
              <div className="my-notes-stack">
                {notes.map(note => {
                  const ext = (note.originalFileName?.split('.').pop() || 'FILE').toUpperCase()
                  return (
                    <div className="my-note-row" key={note._id}>
                      <div className="row-file-badge">{ext.slice(0, 4)}</div>
                      <div className="row-content">
                        <h4 className="row-title">{note.title}</h4>
                        <div className="row-meta">
                          <span className="row-subject">{note.subject}</span>
                          <span>•</span>
                          <span>{formatFileSize(note.fileSize)}</span>
                          <span>•</span>
                          <span>{note.downloads || 0} downloads</span>
                        </div>
                      </div>

                      <div className="row-actions">
                        <button
                          type="button"
                          onClick={() => setPreviewNote(note)}
                          className="action-btn preview"
                          title="Preview Note"
                        >
                          👁️
                        </button>
                        <a
                          href={`${SERVER_BASE}/api/notes/${note._id}/download`}
                          className="action-btn download"
                          target="_blank"
                          rel="noreferrer"
                          title="Download"
                        >
                          📥
                        </a>
                        {/* Share button */}
                        <div
                          className="action-share-wrapper"
                          ref={el => shareRefs.current[note._id] = el}
                        >
                          <button
                            type="button"
                            className="action-btn share"
                            onClick={e => handleShare(note, e)}
                            title="Share"
                            id={`share-dash-${note._id}`}
                          >
                            🔗
                          </button>
                          {openShareId === note._id && (
                            <div className="share-card-dropdown share-card-dropdown--left">
                              <p className="share-dropdown-title">Share via</p>
                              <div className="share-card-options">
                                {getShareOptions(note).map(opt => (
                                  <a
                                    key={opt.id}
                                    href={opt.href}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="share-card-option"
                                    style={{ '--platform-color': opt.color }}
                                    onClick={() => setOpenShareId(null)}
                                  >
                                    {opt.label}
                                  </a>
                                ))}
                              </div>
                              <button
                                className={`share-copy-link-btn ${copiedId === note._id ? 'copied' : ''}`}
                                onClick={() => handleCopyLink(note)}
                                id={`copy-dash-${note._id}`}
                              >
                                {copiedId === note._id ? '✅ Copied!' : '🔗 Copy Link'}
                              </button>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleEdit(note)}
                          className="action-btn edit"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(note._id)}
                          className="action-btn delete"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="panel-empty">
                <span className="empty-emoji">📂</span>
                <h4>No uploaded notes yet</h4>
                <p>Use the form to upload your first study material and help other learners.</p>
              </div>
            )}
          </div>

          {/* Danger zone box */}
          <div className="danger-zone-card">
            <div className="danger-zone-header">
              <span className="danger-zone-icon">⚠️</span>
              <div>
                <h4>Account Management</h4>
                <p>Permanently remove your account and all {notes.length} uploaded resources.</p>
              </div>
            </div>
            <button
              onClick={handleDeleteAccount}
              className="btn btn-danger btn-sm"
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete My Account'}
            </button>
          </div>
        </div>
      </div>

      {/* Note Preview Modal */}
      {previewNote && (
        <NotePreviewModal
          note={previewNote}
          onClose={() => setPreviewNote(null)}
        />
      )}
    </div>
  )
}
