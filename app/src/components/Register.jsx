import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api, { getError } from '../api'

export default function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = e => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match.')
    }
    if (formData.password.length < 8) {
      return setError('Password must be at least 8 characters long.')
    }

    setLoading(true)
    try {
      await api.post('/auth/register', {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        securityQuestion: formData.securityQuestion || "What is your favorite color?",
        securityAnswer: formData.securityAnswer
      })
      navigate('/login')
    } catch (err) {
      setError(getError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container-modern">
      <div className="auth-card-modern">
        <div className="auth-header-modern">
          <div className="auth-icon-badge">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="8.5" cy="7.5" r="4"></circle>
              <line x1="20" y1="8" x2="20" y2="14"></line>
              <line x1="23" y1="11" x2="17" y2="11"></line>
            </svg>
          </div>
          <h2>Create your account</h2>
          <p>Join fellow students sharing lecture notes and exam material</p>
        </div>

        {error && <div className="alert-box alert-danger">{error}</div>}

        <form onSubmit={handleSubmit} className="modern-form">
          <div className="form-field">
            <label htmlFor="username">Full Name</label>
            <input
              id="username"
              type="text"
              name="username"
              className="form-input"
              placeholder="e.g. Alex Johnson"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              name="email"
              className="form-input"
              placeholder="alex@university.edu"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              name="password"
              className="form-input"
              placeholder="At least 8 characters"
              value={formData.password}
              onChange={handleChange}
              minLength={8}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              className="form-input"
              placeholder="Re-enter password"
              value={formData.confirmPassword}
              onChange={handleChange}
              minLength={8}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="securityQuestion">Security Question (for password reset)</label>
            <select
              id="securityQuestion"
              name="securityQuestion"
              className="form-input"
              value={formData.securityQuestion || "What is your favorite color?"}
              onChange={handleChange}
              required
            >
              <option value="What is your favorite color?">What is your favorite color?</option>
              <option value="What was the name of your first school?">What was the name of your first school?</option>
              <option value="What is your pet's name?">What is your pet's name?</option>
              <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
              <option value="What city were you born in?">What city were you born in?</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="securityAnswer">Your Answer</label>
            <input
              id="securityAnswer"
              type="text"
              name="securityAnswer"
              className="form-input"
              placeholder="e.g. Blue"
              value={formData.securityAnswer || ''}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Free Account'}
          </button>
        </form>

        <div className="auth-card-footer">
          Already have an account? <Link to="/login">Sign in here</Link>
        </div>
      </div>
    </div>
  )
}
