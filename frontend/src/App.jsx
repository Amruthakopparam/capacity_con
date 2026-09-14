import { useState } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom'

import './App.css'

import HomePage from './pages/HomePage'
import AuthPage from './pages/AuthPage'
import TraineeDashboard from './pages/TraineeDashboard'
import TrainerDashboard from './pages/TrainerDashboard'
import AdminDashboard from './pages/AdminDashboard'
import ProtectedRoute from './components/ProtectedRoute'

function AppContent() {
  const navigate = useNavigate()

  // Restore user after refreshing the page
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem(
      'capacity_connect_user'
    )

    if (!savedUser) {
      return null
    }

    try {
      return JSON.parse(savedUser)
    } catch {
      localStorage.removeItem('capacity_connect_user')
      return null
    }
  })

  async function handleLogin(role, email, password) {
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

    // Make sure the selected role matches the database role
    if (
      data.user &&
      data.user.role &&
      data.user.role.toLowerCase() !== role.toLowerCase()
    ) {
      throw new Error(
        `This account is registered as ${data.user.role}, not ${role}.`
      )
    }

    // Store JWT
    localStorage.setItem(
      'capacity_connect_token',
      data.token
    )

    // Store user so the session survives page refresh
    localStorage.setItem(
      'capacity_connect_user',
      JSON.stringify(data.user)
    )

    setUser(data.user)

    // Send user to the correct dashboard
    const dashboardRoutes = {
      trainee: '/trainee-dashboard',
      trainer: '/trainer-dashboard',
      admin: '/admin-dashboard',
    }

    navigate(
      dashboardRoutes[data.user.role.toLowerCase()] || '/'
    )
  }

  async function handleSignup(
    role,
    name,
    email,
    password
  ) {
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

    // Account is created as pending by the backend
    navigate(`/login/${role}`, {
      state: {
        success:
          'Account created successfully. Your account is waiting for Admin approval.',
      },
    })
  }

  function handleLogout() {
    localStorage.removeItem('capacity_connect_token')
    localStorage.removeItem('capacity_connect_user')

    setUser(null)
    navigate('/')
  }

  return (
    <Routes>
      {/* ================= HOME ================= */}

      <Route
        path="/"
        element={<HomePage />}
      />

      {/* ================= AUTH ================= */}

      <Route
        path="/login/:role"
        element={
          <AuthPage
            mode="login"
            onLogin={handleLogin}
          />
        }
      />

      <Route
        path="/signup/:role"
        element={
          <AuthPage
            mode="signup"
            onSignup={handleSignup}
          />
        }
      />

      {/* ================= TRAINEE ================= */}

      <Route
        path="/trainee-dashboard"
        element={
          <ProtectedRoute
            user={user}
            allowedRole="trainee"
          >
            <TraineeDashboard
              user={user}
              onLogout={handleLogout}
            />
          </ProtectedRoute>
        }
      />

      {/* ================= TRAINER ================= */}

      <Route
        path="/trainer-dashboard"
        element={
          <ProtectedRoute
            user={user}
            allowedRole="trainer"
          >
            <TrainerDashboard
              user={user}
              onLogout={handleLogout}
            />
          </ProtectedRoute>
        }
      />

      {/* ================= ADMIN ================= */}

      <Route
        path="/admin-dashboard"
        element={
          <ProtectedRoute
            user={user}
            allowedRole="admin"
          >
            <AdminDashboard
              user={user}
              onLogout={handleLogout}
            />
          </ProtectedRoute>
        }
      />

      {/* ================= FALLBACK ================= */}

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App