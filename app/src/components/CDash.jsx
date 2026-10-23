import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import api, { getError, SERVER_BASE } from '../api'
import NotePreviewModal from './NotePreviewModal'

const POPULAR_SUBJECTS = ['All', 'Computer Science', 'Programming', 'Mathematics', 'Physics', 'Engineering', 'Business']

export default function CDash() {
  const [notes, setNotes] = useState([])
  const [search, setSearch] = useState('')
  const [subject, setSubject] = useState('All')
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [previewNote, setPreviewNote] = useState(null)
  const [openShareId, setOpenShareId] = useState(null)
  const [copiedId, setCopiedId] = useState(null)
  const shareRefs = useRef({})

  const isLoggedIn = Boolean(localStorage.getItem('token'))

  // Close share dropdown on outside click
  useEffect(() => {
    const handler = e => {
      const anyOpen = Object.values(shareRefs.current).some(
        el => el && el.contains(e.target)
      )
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

  const fetchNotes = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/notes', {
        params: {
          search,
          subject: subject === 'All' ? '' : subject,
          page,
          limit: 9
        }
      })
      setNotes(res.data.notes || [])
      setPages(res.data.pages || 1)
      setTotal(res.data.total || 0)
    } catch (err) {
      setError(getError(err))
    } finally {
      setLoading(false)
    }
  }, [search, subject, page])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNotes()
    }, 280)
    return () => clearTimeout(timer)
  }, [fetchNotes])

  const getFileBadge = (filename = '') => {
    const ext = filename.split('.').pop().toLowerCase()
    if (ext === 'pdf') return { label: 'PDF', bg: '#fee2e2', color: '#dc2626' }
    if (['doc', 'docx'].includes(ext)) return { label: 'DOC', bg: '#e0e7ff', color: '#4338ca' }
    if (['ppt', 'pptx'].includes(ext)) return { label: 'PPT', bg: '#ffedd5', color: '#c2410c' }
    if (['xls', 'xlsx'].includes(ext)) return { label: 'XLS', bg: '#dcfce7', color: '#15803d' }
    return { label: 'FILE', bg: '#f1f5f9', color: '#475569' }
  }

  const formatFileSize = bytes => {
    if (!bytes) return ''
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="homepage-wrapper">
      {/* Modern Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-pill">
            <span className="pill-pulse"></span>
            Free Open Community for Students
          </div>
          <h1 className="hero-heading">
            Share knowledge, ace your exams <br className="hero-br" />
            <span className="text-gradient">with verified peer notes.</span>
          </h1>
          <p className="hero-subtitle">
            A clean, community-driven platform to discover semester notes, lab manuals, and previous year solutions uploaded by university students.
          </p>

          <div className="hero-cta-group">
            <a href="#explore" className="btn btn-primary btn-lg">
              Explore Library <span>↓</span>
            </a>
            <Link to={isLoggedIn ? "/dashboard" : "/login"} className="btn btn-secondary btn-lg">
              {isLoggedIn ? "Upload Your Notes" : "Contribute Notes"}
            </Link>
          </div>

          <div className="hero-stats-row">
            <div className="hero-stat-item">
              <strong>{total}+</strong>
              <span>Uploaded Notes</span>
            </div>
            <div className="stat-divider"></div>
            <div className="hero-stat-item">
              <strong>100%</strong>
              <span>Free Downloads</span>
            </div>
            <div className="stat-divider"></div>
            <div className="hero-stat-item">
              <strong>Instant</strong>
              <span>Direct Access</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="main-content-wrap" id="explore">
        {/* Search & Subject Chips */}
        <div className="filter-card">
          <div className="search-input-wrapper">
            <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Search by note title, subject, or keywords..."
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
            {search && (
              <button className="clear-search-btn" onClick={() => setSearch('')}>
                ✕
              </button>
            )}
          </div>

          <div className="subject-chips-row">
            <span className="chips-label">Topics:</span>
            <div className="chips-list">
              {POPULAR_SUBJECTS.map(s => (
                <button
                  key={s}
                  type="button"
                  className={`chip-btn ${subject === s ? 'active' : ''}`}
                  onClick={() => {
                    setSubject(s)
                    setPage(1)
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && <div className="alert-box alert-danger">{error}</div>}

        {/* Section Title */}
        <div className="results-header">
          <div>
            <h2 className="results-title">Study Resources</h2>
            <p className="results-subtitle">
              {subject === 'All' ? 'Showing all recent resources' : `Filtered by ${subject}`}
            </p>
          </div>
          <span className="results-count-badge">{total} available</span>
        </div>

        {/* Cards Grid */}
        {loading ? (
          <div className="skeleton-grid">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div className="skeleton-card" key={i}>
                <div className="skeleton-header"></div>
                <div className="skeleton-line short"></div>
                <div className="skeleton-line"></div>
                <div className="skeleton-footer"></div>
              </div>
            ))}
          </div>
        ) : notes.length > 0 ? (
          <>
            <div className="modern-notes-grid">
              {notes.map(note => {
                const badge = getFileBadge(note.originalFileName)
                return (
                  <article className="study-card" key={note._id}>
                    <div className="card-top-meta">
                      <span className="file-badge" style={{ backgroundColor: badge.bg, color: badge.color }}>
                        {badge.label}
                      </span>
                      <span className="subject-tag">{note.subject || 'General'}</span>
                    </div>

                    <h3 className="card-note-title" title={note.title}>
                      {note.title}
                    </h3>

                    <p className="card-note-description">
                      {note.description || 'Comprehensive notes and study material shared by a classmate.'}
                    </p>

                    <div className="card-user-info">
                      <div className="user-avatar-circle">
                        {(note.uploaderName || 'S')[0].toUpperCase()}
                      </div>
                      <div className="user-details">
                        <span className="author-name">{note.uploaderName || 'Student'}</span>
                        <span className="upload-date">
                          {new Date(note.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="card-bottom-actions">
                      <div className="stats-info">
                        <span>📥 {note.downloads || 0}</span>
                        {note.fileSize ? <span>• {formatFileSize(note.fileSize)}</span> : null}
                      </div>

                      <div className="card-action-btns">
                        <button
                          type="button"
                          className="btn-preview-card"
                          onClick={() => setPreviewNote(note)}
                        >
                          Preview 👁️
                        </button>
                        <a
                          href={`${SERVER_BASE}/api/notes/${note._id}/download`}
                          className="btn-download-card"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Download <span>↓</span>
                        </a>
                        {/* Share button */}
                        <div
                          className="card-share-wrapper"
                          ref={el => shareRefs.current[note._id] = el}
                        >
                          <button
                            type="button"
                            className="btn-share-card"
                            onClick={e => handleShare(note, e)}
                            title="Share this note"
                            id={`share-card-${note._id}`}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="13" height="13">
                              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                            </svg>
                          </button>
                          {openShareId === note._id && (
                            <div className="share-card-dropdown">
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
                                id={`copy-card-${note._id}`}
                              >
                                {copiedId === note._id ? '✅ Copied!' : '🔗 Copy Link'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>

            {/* Pagination Controls */}
            {pages > 1 && (
              <div className="pagination-wrapper">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="btn-page"
                >
                  ← Previous
                </button>
                <div className="page-numbers">
                  Page <strong>{page}</strong> of <strong>{pages}</strong>
                </div>
                <button
                  disabled={page >= pages}
                  onClick={() => setPage(p => p + 1)}
                  className="btn-page"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state-modern">
            <div className="empty-icon-wrap">🔍</div>
            <h3>No study materials found</h3>
            <p>We couldn&apos;t find any notes matching your filter criteria.</p>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setSearch('')
                setSubject('All')
              }}
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Feature / Callout Box */}
        <section className="community-cta-box">
          <div className="cta-content">
            <h3>Have notes that could help others?</h3>
            <p>Upload your handwritten class summaries or lecture slides to help students prep for exams.</p>
          </div>
          <Link to={isLoggedIn ? "/dashboard" : "/register"} className="btn btn-primary btn-cta">
            {isLoggedIn ? "Go to Dashboard" : "Join & Upload"}
          </Link>
        </section>
      </main>

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
