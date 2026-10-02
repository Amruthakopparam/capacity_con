import { useState } from 'react'
import {
  Link,
  Navigate,
  useLocation,
  useParams,
} from 'react-router-dom'
import './AuthPage.css'

const ROLES = ['trainee', 'trainer', 'admin']

const ROLE_INFO = {
  trainee: {
    label: 'Trainee',
    headline: 'Learn. Progress. Get certified.',
    points: [
      'Browse and enroll in courses',
      'Complete Beginner, Intermediate and Advanced levels',
      'Earn one final certificate per course',
    ],
  },
  trainer: {
    label: 'Trainer',
    headline: 'Qualify. Teach. Be verified.',
    points: [
      'Build a professional profile with qualifications and experience',
      'Upload documents for verification',
      'Create courses and assessments once approved',
    ],
  },
  admin: {
    label: 'Admin',
    headline: 'Verify. Govern. Oversee.',
    points: [
      'Review and approve trainers',
      'Verify submitted documents',
      'Monitor the platform',
    ],
  },
}

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'One number', test: (p) => /\d/.test(p) },
  { label: 'One special character', test: (p) => /[^A-Za-z\d]/.test(p) },
]

function friendlyError(message) {
  if (message === 'Account is not active') {
    return 'Your account is not active yet. It may still be waiting for admin approval.'
  }
  return message
}

function AuthPage({ mode, onLogin, onSignup }) {
  const { role } = useParams()
  const location = useLocation()

  const isSignup = mode === 'signup'
  const normalizedRole = role ? role.toLowerCase() : ''

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(location.state?.success || '')

  // Invalid role in the URL, or public signup for admin
  if (!ROLES.includes(normalizedRole)) {
    return <Navigate to="/" replace />
  }

  if (isSignup && normalizedRole === 'admin') {
    return <Navigate to="/login/admin" replace />
  }

  const info = ROLE_INFO[normalizedRole]
  const passwordOk = PASSWORD_RULES.every((rule) => rule.test(password))

  function resetForm() {
    setError('')
    setSuccess('')
    setPassword('')
    setShowPassword(false)
  }

  async function handleSubmit(event) {
    event.preventDefault()

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (isSignup) {
        if (!name.trim()) {
          throw new Error('Please enter your full name.')
        }

        if (!passwordOk) {
          throw new Error('Your password does not meet all the requirements below.')
        }

        await onSignup(
          normalizedRole,
          name.trim(),
          email.trim(),
          password
        )

        return
      }

      await onLogin(normalizedRole, email.trim(), password)
    } catch (err) {
      setError(
        friendlyError(
          err instanceof Error ? err.message : 'Something went wrong.'
        )
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth">
      {/* ================= LEFT PANEL ================= */}
      <aside className="auth-side">
        <Link to="/" className="auth-brand">
          <span className="auth-brand-mark">C</span>
          <span className="auth-brand-name">Capacity Connect</span>
        </Link>

        <div className="auth-side-body">
          <span className="auth-side-tag">{info.label}</span>

          <h2>{info.headline}</h2>

          <ul>
            {info.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>

        <p className="auth-side-foot">
          Learning and Capacity Building Portal
        </p>
      </aside>

      {/* ================= FORM ================= */}
      <main className="auth-main">
        <div className="auth-topbar">
          <Link to="/" className="auth-back">
            ← Back to home
          </Link>

          <Link to="/" className="auth-brand auth-brand-mobile">
            <span className="auth-brand-mark">C</span>
            <span className="auth-brand-name">Capacity Connect</span>
          </Link>
        </div>

        <div className="auth-card">
          {/* Role tabs */}
          <div className="auth-tabs" role="tablist" aria-label="Choose role">
            {ROLES.map((r) => {
              const target =
                isSignup && r === 'admin' ? '/login/admin' : `/${mode}/${r}`

              return (
                <Link
                  key={r}
                  to={target}
                  role="tab"
                  aria-selected={r === normalizedRole}
                  className={`auth-tab ${r === normalizedRole ? 'active' : ''}`}
                  onClick={resetForm}
                >
                  {ROLE_INFO[r].label}
                </Link>
              )
            })}
          </div>

          <h1>
            {isSignup
              ? `Create your ${info.label.toLowerCase()} account`
              : 'Welcome back'}
          </h1>

          <p className="auth-sub">
            {isSignup
              ? 'Fill in your details to get started.'
              : `Sign in to your ${info.label.toLowerCase()} dashboard.`}
          </p>

          {isSignup && normalizedRole === 'trainer' && (
            <div className="auth-alert info">
              Trainer accounts are reviewed by an admin. You can log in once
              your account has been approved.
            </div>
          )}

          {success && (
            <div className="auth-alert success" role="status">
              {success}
            </div>
          )}

          {error && (
            <div className="auth-alert error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate={false}>
            {isSignup && (
              <div className="auth-field">
                <label htmlFor="name">Full name</label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </div>
            )}

            <div className="auth-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="Enter your email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="password">Password</label>

              <div className="auth-password">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  placeholder={
                    isSignup ? 'Create a password' : 'Enter your password'
                  }
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />

                <button
                  type="button"
                  className="auth-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {isSignup && (
              <ul className="auth-rules" aria-label="Password requirements">
                {PASSWORD_RULES.map((rule) => (
                  <li
                    key={rule.label}
                    className={rule.test(password) ? 'met' : ''}
                  >
                    {rule.label}
                  </li>
                ))}
              </ul>
            )}

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading
                ? isSignup
                  ? 'Creating account...'
                  : 'Signing in...'
                : isSignup
                  ? 'Create account'
                  : 'Sign in'}
            </button>
          </form>

          {normalizedRole === 'admin' ? (
            <p className="auth-footnote">
              Admin accounts are created by authorized platform
              administrators.
            </p>
          ) : (
            <p className="auth-footnote">
              {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
              <Link
                to={`/${isSignup ? 'login' : 'signup'}/${normalizedRole}`}
                onClick={resetForm}
              >
                {isSignup ? 'Sign in' : 'Create account'}
              </Link>
            </p>
          )}
        </div>
      </main>
    </div>
  )
}

export default AuthPage