import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api, { getError } from '../api'

export default function ForgotPassword() {
  const [step, setStep] = useState(1) // 1 = enter email, 2 = answer security question & reset
  const [email, setEmail] = useState('')
  const [securityQuestion, setSecurityQuestion] = useState('')
  const [securityAnswer, setSecurityAnswer] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleFetchQuestion = async e => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const res = await api.post('/auth/get-security-question', { email })
      setSecurityQuestion(res.data.securityQuestion || 'What is your favorite color?')
      setStep(2)
    } catch (err) {
      setError(getError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async e => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!securityAnswer.trim()) {
      return setError('Please enter your security answer.')
    }
    if (newPassword !== confirmPassword) {
      return setError('Passwords do not match.')
    }
    if (newPassword.length < 8) {
      return setError('New password must be at least 8 characters long.')
    }

    setLoading(true)
    try {
      const res = await api.post('/auth/reset-password-security', {
        email,
        securityAnswer: securityAnswer.trim(),
        newPassword
      })
      setSuccess(res.data.message || 'Password reset successfully! Redirecting to login...')
      setTimeout(() => {
        navigate('/login')
      }, 2000)
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
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h2>{step === 1 ? 'Forgot Password' : 'Security Verification'}</h2>
          <p>
            {step === 1
              ? 'Enter your registered email to load your security question'
              : 'Answer your security question to set a new password'}
          </p>
        </div>

        {error && <div className="alert-box alert-danger">{error}</div>}
        {success && <div className="alert-box alert-success">{success}</div>}

        {step === 1 ? (
          <form onSubmit={handleFetchQuestion} className="modern-form">
            <div className="form-field">
              <label htmlFor="reset-email">Registered Email address</label>
              <input
                id="reset-email"
                type="email"
                className="form-input"
                placeholder="alex@university.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
              {loading ? 'Finding account...' : 'Continue to Security Question →'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="modern-form">
            <div className="form-field">
              <label>Your Security Question</label>
              <div
                style={{
                  padding: '12px 14px',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontWeight: '600',
                  color: '#1e293b'
                }}
              >
                ❓ {securityQuestion}
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="security-answer">Your Security Answer</label>
              <input
                id="security-answer"
                type="text"
                className="form-input"
                placeholder="Enter your security answer"
                value={securityAnswer}
                onChange={e => setSecurityAnswer(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="new-pass">New Password</label>
              <input
                id="new-pass"
                type="password"
                className="form-input"
                placeholder="Minimum 8 characters"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="confirm-pass">Confirm New Password</label>
              <input
                id="confirm-pass"
                type="password"
                className="form-input"
                placeholder="Repeat your new password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
              {loading ? 'Resetting password...' : 'Reset Password'}
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-block"
              onClick={() => {
                setStep(1)
                setError('')
                setSuccess('')
                setSecurityAnswer('')
              }}
              disabled={loading}
              style={{ marginTop: '10px' }}
            >
              ← Back to Email
            </button>
          </form>
        )}

        <div className="auth-card-footer">
          Remember your password? <Link to="/login">Back to Sign in</Link>
        </div>
      </div>
    </div>
  )
}


