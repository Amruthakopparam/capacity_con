import DashboardLayout from '../layouts/DashboardLayout'
import { trainerNavItems } from '../config/trainerNav'

function TrainerCoursesPlaceholder({ user, onLogout }) {
  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      navItems={trainerNavItems}
      title="My Courses"
    >
      <p style={{ color: 'var(--text-muted)' }}>
        Course management is not built yet. It's coming in a later phase.
      </p>
    </DashboardLayout>
  )
}

export default TrainerCoursesPlaceholder