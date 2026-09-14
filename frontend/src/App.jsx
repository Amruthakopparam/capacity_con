import { useState } from 'react'
import './App.css'

function App() {
  const [screen, setScreen] = useState('home')
  const [role, setRole] = useState('')
  const [user, setUser] = useState(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function selectRole(selectedRole) {
    setRole(selectedRole)
    setScreen('login')
    setName('')
    setEmail('')
    setPassword('')
    setError('')
    setSuccess('')
  }

  function goHome() {
    setScreen('home')
    setRole('')
    setName('')
    setEmail('')
    setPassword('')
    setError('')
    setSuccess('')
  }

  async function handleSignup(event) {
    event.preventDefault()

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(
        'http://localhost:5000/api/auth/signup',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
            email,
            password,
            role,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed')
      }

      setName('')
      setEmail('')
      setPassword('')

      setScreen('login')

      setSuccess(
        'Account created successfully. Your account is waiting for Admin approval.'
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin(event) {
    event.preventDefault()

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(
        'http://localhost:5000/api/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      if (
        data.user &&
        data.user.role &&
        data.user.role.toLowerCase() !== role.toLowerCase()
      ) {
        throw new Error(
          `This account is registered as ${data.user.role}, not ${role}.`
        )
      }

      localStorage.setItem(
        'capacity_connect_token',
        data.token
      )

      setUser(data.user)

      setPassword('')
      setError('')
      setSuccess('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem('capacity_connect_token')

    setUser(null)
    setRole('')
    setScreen('home')
    setName('')
    setEmail('')
    setPassword('')
    setError('')
    setSuccess('')
  }

  if (user) {
  const currentRole = user.role?.toLowerCase()

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>CAPACITY CONNECT</h1>
          <p>
            Digital Capacity Building & Learning Management Portal
          </p>
        </div>

        <button
          className="logout-button"
          onClick={handleLogout}
        >
          Logout
        </button>
      </header>

      <main className="main">
        <section className="dashboard">

          <span className="dashboard-label">
            {user.role} Workspace
          </span>

          <h2>
            Welcome, {user.name}
          </h2>

          <p>
            You are successfully logged in to Capacity Connect.
          </p>

          {/* ================= TRAINEE ================= */}

          {currentRole === 'trainee' && (
            <div className="dashboard-grid">

              <div className="dashboard-card">
                <h3>My Courses</h3>
                <p>
                  View your enrolled training courses and track progress.
                </p>
              </div>

              <div className="dashboard-card">
                <h3>Learning Resources</h3>
                <p>
                  Access videos, PDFs and presentations from your courses.
                </p>
              </div>

              <div className="dashboard-card">
                <h3>Assessments</h3>
                <p>
                  Take assigned assessments and view your results.
                </p>
              </div>

            </div>
          )}

          {/* ================= TRAINER ================= */}

          {currentRole === 'trainer' && (
            <div className="dashboard-grid">

              <div className="dashboard-card">
                <h3>My Courses</h3>
                <p>
                  Create, edit and manage your training courses.
                </p>
              </div>

              <div className="dashboard-card">
                <h3>Learning Resources</h3>
                <p>
                  Upload and manage videos, PDFs and presentations.
                </p>
              </div>

              <div className="dashboard-card">
                <h3>Question Bank</h3>
                <p>
                  Create and manage questions for your assessments.
                </p>
              </div>

              <div className="dashboard-card">
                <h3>Assessments</h3>
                <p>
                  Create assessments, set deadlines and monitor trainees.
                </p>
              </div>

            </div>
          )}

          {/* ================= ADMIN ================= */}

          {currentRole === 'admin' && (
            <div className="dashboard-grid">

              <div className="dashboard-card">
                <h3>User Approvals</h3>
                <p>
                  Review users and manage account approval.
                </p>
              </div>

              <div className="dashboard-card">
                <h3>Platform Overview</h3>
                <p>
                  Monitor trainees, trainers, courses and assessments.
                </p>
              </div>

              <div className="dashboard-card">
                <h3>Competency Mapping</h3>
                <p>
                  View trainer expertise and organizational competency gaps.
                </p>
              </div>

              <div className="dashboard-card">
                <h3>Notifications</h3>
                <p>
                  Manage announcements and platform notifications.
                </p>
              </div>

            </div>
          )}

        </section>
      </main>

      <footer className="footer">
        CAPACITY CONNECT — Learning & Capacity Building Portal
      </footer>
    </div>
  )
}
      

       


  if (screen === 'home') {
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
          <section className="welcome">
            <h2>Welcome to Capacity Connect</h2>

            <p>
              Learn, build skills, access resources, complete
              assessments, and track your professional growth.
            </p>

            <div className="role-buttons">
              <button
                onClick={() => selectRole('trainee')}
              >
                Trainee Login
              </button>

              <button
                onClick={() => selectRole('trainer')}
              >
                Trainer Login
              </button>

              <button
                onClick={() => selectRole('admin')}
              >
                Admin Login
              </button>
            </div>
          </section>
        </main>

        <footer className="footer">
          CAPACITY CONNECT — Learning & Capacity Building Portal
        </footer>
      </div>
    )
  }

  const signupMode = screen === 'signup'

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
            onClick={goHome}
          >
            ← Back
          </button>

          <span className="login-label">
            {role} {signupMode ? 'Signup' : 'Login'}
          </span>

          <h2>
            {signupMode
              ? 'Create Your Account'
              : 'Sign In to Capacity Connect'}
          </h2>

          <p className="login-description">
            {signupMode
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

          {signupMode ? (
            <form onSubmit={handleSignup}>

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

              <label htmlFor="signup-email">
                Email
              </label>

              <input
                id="signup-email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                required
              />

              <label htmlFor="signup-password">
                Password
              </label>

              <input
                id="signup-password"
                type="password"
                placeholder="Create a password"
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
                  ? 'Creating Account...'
                  : 'Create Account'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin}>

              <label htmlFor="login-email">
                Email
              </label>

              <input
                id="login-email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                required
              />

              <label htmlFor="login-password">
                Password
              </label>

              <input
                id="login-password"
                type="password"
                placeholder="Enter your password"
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
                  ? 'Signing In...'
                  : 'Sign In'}
              </button>
            </form>
          )}

          <div className="auth-switch">
            <span>
              {signupMode
                ? 'Already have an account?'
                : "Don't have an account?"}
            </span>

            <button
              type="button"
              className="switch-button"
              onClick={() => {
                setScreen(
                  signupMode ? 'login' : 'signup'
                )
                setError('')
                setSuccess('')
                setName('')
                setEmail('')
                setPassword('')
              }}
            >
              {signupMode
                ? 'Sign In'
                : 'Create Account'}
            </button>
          </div>

        </section>
      </main>

      <footer className="footer">
        CAPACITY CONNECT — Learning & Capacity Building Portal
      </footer>
    </div>
  )
}

export default App