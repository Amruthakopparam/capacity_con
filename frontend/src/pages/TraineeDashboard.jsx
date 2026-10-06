import { Link } from "react-router-dom"
import DashboardLayout from "../layouts/DashboardLayout"
import { traineeNavItems } from "../config/traineeNav"

function TraineeDashboard({ user, onLogout }) {
  return (
    <DashboardLayout user={user} onLogout={onLogout} navItems={traineeNavItems} title="Trainee Workspace">
      <h2 style={{ marginTop: 0 }}>Welcome, {user.name}</h2>
      <p style={{ color: "var(--text-muted)" }}>
        Continue your learning journey and build your professional competencies.
      </p>

      <div className="dashboard-grid">
        <Link to="/trainee-dashboard/courses" className="dashboard-card">
          <h3>Browse Courses</h3>
          <p>Discover new courses across beginner, intermediate and advanced levels.</p>
        </Link>

        <Link to="/trainee-dashboard/my-courses" className="dashboard-card">
          <h3>My Courses</h3>
          <p>View your enrolled courses, resources and assessments.</p>
        </Link>

        <Link to="/trainee-dashboard/notifications" className="dashboard-card">
          <h3>Notifications</h3>
          <p>Check updates about your courses and assessments.</p>
        </Link>
      </div>
    </DashboardLayout>
  )
}

export default TraineeDashboard
