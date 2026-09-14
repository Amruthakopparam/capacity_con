function TraineeDashboard({
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
            Trainee Workspace
          </span>

          <h2>
            Welcome, {user.name}
          </h2>

          <p>
            Continue your learning journey and build your
            professional competencies.
          </p>

          <div className="dashboard-grid">

            <div className="dashboard-card">
              <h3>My Courses</h3>
              <p>
                View your enrolled courses and track progress.
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

        </section>

      </main>

      <footer className="footer">
        CAPACITY CONNECT — Learning & Capacity Building Portal
      </footer>

    </div>
  )
}

export default TraineeDashboard
