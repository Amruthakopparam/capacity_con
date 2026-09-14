import { useState } from 'react'
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'

function AuthPage({
  mode,
  onLogin,
  onSignup,
}) {
  const { role } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const isSignup = mode === 'signup'

  const normalizedRole = role
    ? role.toLowerCase()
    : ''

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(
    location.state?.success
      ? ''
      : ''
  )

  const [success, setSuccess] = useState(
    location.state?.success || ''
  )

  async function handleSubmit(event) {
    event.preventDefault()

    setLoading(true)
    setError('')

    try {
      if (!normalizedRole) {
        throw new Error('Invalid user role.')
      }

      // Admin accounts should not be created
      // through public signup.
      if (
        isSignup &&
        normalizedRole === 'admin'
      ) {
        throw new Error(
          'Admin accounts cannot be created through public signup.'
        )
      }

      if (isSignup) {
        await onSignup(
          normalizedRole,
          name,
          email,
          password
        )

        return
      }

      await onLogin(
        normalizedRole,
        email,
        password
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong.'
      )
    } finally {
      setLoading(false)
    }
  }

  function switchMode() {
    if (normalizedRole === 'admin') {
      return
    }

    if (isSignup) {
      navigate(`/login/${normalizedRole}`)
    } else {
      navigate(`/signup/${normalizedRole}`)
    }

    setError('')
    setSuccess('')
  }

  return (
    <div className="app">

      <header className="header">
        <div>
          <h1>CAPACITY CONNECT</h1>

          <p>
            Digital Capacity Building & Learning Management Portal
          </p>
        </div>
      </header>

      <main className="main">

        <section className="login-card">

          <button
            className="back-button"
            type="button"
            onClick={() => navigate('/')}
          >
            ← Back
          </button>

          <span className="login-label">
            {normalizedRole} {isSignup ? 'Signup' : 'Login'}
          </span>

          <h2>
            {isSignup
              ? 'Create Your Account'
              : 'Sign In to Capacity Connect'}
          </h2>

          <p className="login-description">
            {isSignup
              ? 'Create a new Capacity Connect account.'
              : 'Enter your registered email and password.'}
          </p>

          {success && (
            <div className="success-message">
              {success}
            </div>
          )}

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>

            {isSignup && (
              <>
                <label htmlFor="name">
                  Full Name
                </label>

                <input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  required
                />
              </>
            )}

            <label htmlFor="email">
              Email
            </label>

            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
            />

            <label htmlFor="password">
              Password
            </label>

            <input
              id="password"
              type="password"
              placeholder={
                isSignup
                  ? 'Create a password'
                  : 'Enter your password'
              }
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
            />

            <button
              type="submit"
              className="login-submit-button"
              disabled={loading}
            >
              {loading
                ? isSignup
                  ? 'Creating Account...'
                  : 'Signing In...'
                : isSignup
                  ? 'Create Account'
                  : 'Sign In'}
            </button>

          </form>

          {/* Public signup is available only
              for trainee and trainer roles. */}

          {normalizedRole !== 'admin' && (
            <div className="auth-switch">

              <span>
                {isSignup
                  ? 'Already have an account?'
                  : "Don't have an account?"}
              </span>

              <button
                type="button"
                className="switch-button"
                onClick={switchMode}
              >
                {isSignup
                  ? 'Sign In'
                  : 'Create Account'}
              </button>

            </div>
          )}

          {normalizedRole === 'admin' && (
            <p className="login-description">
              Admin accounts are created by authorized
              platform administrators.
            </p>
          )}

        </section>

      </main>

      <footer className="footer">
        CAPACITY CONNECT — Learning & Capacity Building Portal
      </footer>

    </div>
  )
}

export default AuthPage