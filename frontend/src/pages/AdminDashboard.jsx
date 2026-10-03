import { Link } from 'react-router-dom'
import DashboardLayout from '../layouts/DashboardLayout'
import { adminNavItems } from '../config/adminNav'

function AdminDashboard({ user, onLogout }) {
  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      navItems={adminNavItems}
      title="Admin Workspace"
    >
      <h2>Welcome, {user.name}</h2>
      <p>Manage users, training operations and organizational capacity development.</p>

      <div className="dashboard-grid">
        <Link to="/admin-dashboard/trainer-review" className="dashboard-card">
          <h3>Trainer Review</h3>
          <p>Approve or reject trainers awaiting verification.</p>
        </Link>

        <div className="dashboard-card">
          <h3>Platform Overview</h3>
          <p>Monitor trainees, trainers, courses and assessments.</p>
        </div>

        <div className="dashboard-card">
          <h3>Competency Mapping</h3>
          <p>View trainer expertise and organizational competency gaps.</p>
        </div>

        <div className="dashboard-card">
          <h3>Notifications</h3>
          <p>Manage announcements and platform notifications.</p>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default AdminDashboard