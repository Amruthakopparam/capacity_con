function AdminDashboard({
  user,
  onLogout,
}) {
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
          onClick={onLogout}
        >
          Logout
        </button>
      </header>

      <main className="main">

        <section className="dashboard">

          <span className="dashboard-label">
            Admin Workspace
          </span>

          <h2>
            Welcome, {user.name}
          </h2>

          <p>
            Manage users, training operations and organizational
            capacity development.
          </p>

          <div className="dashboard-grid">

            <div className="dashboard-card">
              <h3>User Approvals</h3>
              <p>
                Review and manage registered users.
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

        </section>

      </main>

      <footer className="footer">
        CAPACITY CONNECT — Learning & Capacity Building Portal
      </footer>

    </div>
  )
}

export default AdminDashboard