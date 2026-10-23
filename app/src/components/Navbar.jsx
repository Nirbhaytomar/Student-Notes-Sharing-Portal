import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'

export default function Navbar() {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [isNavCollapsed, setIsNavCollapsed] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    setToken(localStorage.getItem('token'))
    setIsNavCollapsed(true)
  }, [location.pathname])

  const handleLogout = () => {
    localStorage.removeItem('token')
    setToken(null)
    navigate('/login')
  }

  return (
    <header className="site-header">
      <div className="header-container">
        <Link to="/" className="brand-logo">
          <div className="brand-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
          </div>
          <span className="brand-text">Notes<span className="brand-highlight">Hub</span></span>
        </Link>

        <button 
          className="mobile-toggler"
          onClick={() => setIsNavCollapsed(!isNavCollapsed)}
          aria-label="Toggle navigation"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>

        <nav className={`nav-menu-bar ${!isNavCollapsed ? 'open' : ''}`}>
          <NavLink to="/" end className="nav-link-item">
            Explore Notes
          </NavLink>

          {token ? (
            <div className="nav-user-actions">
              <NavLink to="/dashboard" className="nav-link-item dashboard-link">
                Dashboard
              </NavLink>
              <button onClick={handleLogout} className="btn-logout">
                Sign Out
              </button>
            </div>
          ) : (
            <div className="nav-auth-actions">
              <NavLink to="/login" className="nav-link-item">
                Sign In
              </NavLink>
              <NavLink to="/register" className="btn btn-primary btn-sm">
                Get Started
              </NavLink>
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}
