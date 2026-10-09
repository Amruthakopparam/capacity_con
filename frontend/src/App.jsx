import { useState } from "react"
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom"

import "./App.css"

import HomePage from "./pages/HomePage"
import AuthPage from "./pages/AuthPage"
import TraineeDashboard from "./pages/TraineeDashboard"
import TraineeBrowseCourses from "./pages/TraineeBrowseCourses"
import TraineeMyCourses from "./pages/TraineeMyCourses"
import TraineeCourseDetail from "./pages/TraineeCourseDetail"
import TraineeAssessment from "./pages/TraineeAssessment"
import TraineeMainTest from "./pages/TraineeMainTest"
import TrainerDashboard from "./pages/TrainerDashboard"
import TrainerVerification from "./pages/TrainerVerification"
import TrainerCourses from "./pages/TrainerCourses"
import TrainerCourseDetail from "./pages/TrainerCourseDetail"
import TrainerSkillTest from "./pages/TrainerSkillTest"
import TrainerCompetency from "./pages/TrainerCompetency"
import TraineeCertificates from "./pages/TraineeCertificates"
import AdminDashboard from "./pages/AdminDashboard"
import ProtectedRoute from "./components/ProtectedRoute"
import AdminTrainerReview from "./pages/AdminTrainerReview"
import AdminSkillTestQuestions from "./pages/AdminSkillTestQuestions"
import AdminMainTestReview from "./pages/AdminMainTestReview"
import Notifications from "./pages/Notifications"
import { traineeNavItems } from "./config/traineeNav"
import { trainerNavItems } from "./config/trainerNav"
import { adminNavItems } from "./config/adminNav"


function AppContent() {
  const navigate = useNavigate()

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("capacity_connect_user")

    if (!savedUser) {
      return null
    }

    try {
      return JSON.parse(savedUser)
    } catch {
      localStorage.removeItem("capacity_connect_user")
      return null
    }
  })

  async function handleLogin(role, email, password) {
    const response = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || "Login failed")
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

    localStorage.setItem("capacity_connect_token", data.token)
    localStorage.setItem("capacity_connect_user", JSON.stringify(data.user))

    setUser(data.user)

    const dashboardRoutes = {
      trainee: "/trainee-dashboard",
      trainer: "/trainer-dashboard",
      admin: "/admin-dashboard",
    }

    navigate(dashboardRoutes[data.user.role.toLowerCase()] || "/")
  }

  async function handleSignup(role, name, email, password) {
    const response = await fetch("http://localhost:5000/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        email,
        password,
        role,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || "Signup failed")
    }

    navigate(`/login/${role}`, {
      state: {
        success:
          "Account created successfully. Your account is waiting for Admin approval.",
      },
    })
  }

  function handleLogout() {
    localStorage.removeItem("capacity_connect_token")
    localStorage.removeItem("capacity_connect_user")

    setUser(null)
    navigate("/")
  }

  return (
    <Routes>
      {/* ================= HOME ================= */}

      <Route path="/" element={<HomePage />} />

      {/* ================= AUTH ================= */}

      <Route
        path="/login/:role"
        element={<AuthPage mode="login" onLogin={handleLogin} />}
      />

      <Route
        path="/signup/:role"
        element={<AuthPage mode="signup" onSignup={handleSignup} />}
      />

      {/* ================= TRAINEE ================= */}

      <Route
        path="/trainee-dashboard"
        element={
          <ProtectedRoute user={user} allowedRole="trainee">
            <TraineeDashboard user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/trainee-dashboard/courses"
        element={
          <ProtectedRoute user={user} allowedRole="trainee">
            <TraineeBrowseCourses user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/trainee-dashboard/my-courses"
        element={
          <ProtectedRoute user={user} allowedRole="trainee">
            <TraineeMyCourses user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/trainee-dashboard/courses/:courseId"
        element={
          <ProtectedRoute user={user} allowedRole="trainee">
            <TraineeCourseDetail user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/trainee-dashboard/assessment/:assessmentId"
        element={
          <ProtectedRoute user={user} allowedRole="trainee">
            <TraineeAssessment user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/trainee-dashboard/main-test/:batchId"
        element={
          <ProtectedRoute user={user} allowedRole="trainee">
            <TraineeMainTest user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/trainee-dashboard/certificates"
        element={
          <ProtectedRoute user={user} allowedRole="trainee">
            <TraineeCertificates user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />


      <Route
        path="/trainee-dashboard/notifications"
        element={
          <ProtectedRoute user={user} allowedRole="trainee">
            <Notifications
              user={user}
              onLogout={handleLogout}
              navItems={traineeNavItems}
              title="Notifications"
            />
          </ProtectedRoute>
        }
      />

      {/* ================= TRAINER ================= */}

      <Route
        path="/trainer-dashboard"
        element={
          <ProtectedRoute user={user} allowedRole="trainer">
            <TrainerDashboard user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/trainer-dashboard/verification"
        element={
          <ProtectedRoute user={user} allowedRole="trainer">
            <TrainerVerification user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/trainer-dashboard/skill-test"
        element={
          <ProtectedRoute user={user} allowedRole="trainer">
            <TrainerSkillTest user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/trainer-dashboard/courses"
        element={
          <ProtectedRoute user={user} allowedRole="trainer">
            <TrainerCourses user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/trainer-dashboard/courses/:id"
        element={
          <ProtectedRoute user={user} allowedRole="trainer">
            <TrainerCourseDetail user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/trainer-dashboard/competency"
        element={
          <ProtectedRoute user={user} allowedRole="trainer">
            <TrainerCompetency user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />


      <Route
        path="/trainer-dashboard/notifications"
        element={
          <ProtectedRoute user={user} allowedRole="trainer">
            <Notifications
              user={user}
              onLogout={handleLogout}
              navItems={trainerNavItems}
              title="Notifications"
            />
          </ProtectedRoute>
        }
      />

      {/* ================= ADMIN ================= */}

      <Route
        path="/admin-dashboard"
        element={
          <ProtectedRoute user={user} allowedRole="admin">
            <AdminDashboard user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin-dashboard/trainer-review"
        element={
          <ProtectedRoute user={user} allowedRole="admin">
            <AdminTrainerReview user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin-dashboard/skill-test-questions"
        element={
          <ProtectedRoute user={user} allowedRole="admin">
            <AdminSkillTestQuestions user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin-dashboard/main-test-review"
        element={
          <ProtectedRoute user={user} allowedRole="admin">
            <AdminMainTestReview user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin-dashboard/notifications"
        element={
          <ProtectedRoute user={user} allowedRole="admin">
            <Notifications
              user={user}
              onLogout={handleLogout}
              navItems={adminNavItems}
              title="Notifications"
            />
          </ProtectedRoute>
        }
      />

      {/* ================= FALLBACK ================= */}

      <Route path="*" element={<Navigate to="/" replace />} />
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
