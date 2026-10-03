import DashboardLayout from '../layouts/DashboardLayout'
import { trainerNavItems } from '../config/trainerNav'

function TrainerDashboard({ user, onLogout }) {
  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      navItems={trainerNavItems}
      title="Trainer Workspace"
    >
      <h2 style={{ marginTop: 0 }}>Welcome, {user.name}</h2>
      <p style={{ color: 'var(--text-muted)' }}>
        Create learning experiences and monitor trainee progress.
      </p>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>My Courses</h3>
          <p>Create, edit and manage your training courses.</p>
        </div>
        <div className="dashboard-card">
          <h3>Learning Resources</h3>
          <p>Upload and manage videos, PDFs and presentations.</p>
        </div>
        <div className="dashboard-card">
          <h3>Question Bank</h3>
          <p>Create and manage assessment questions.</p>
        </div>
        <div className="dashboard-card">
          <h3>Assessments</h3>
          <p>Create assessments, set deadlines and monitor trainees.</p>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default TrainerDashboard