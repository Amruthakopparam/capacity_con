function TrainerDashboard({
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
            Trainer Workspace
          </span>

          <h2>
            Welcome, {user.name}
          </h2>

          <p>
            Create learning experiences and monitor trainee progress.
          </p>

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
                Create and manage assessment questions.
              </p>
            </div>

            <div className="dashboard-card">
              <h3>Assessments</h3>
              <p>
                Create assessments, set deadlines and monitor trainees.
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

export default TrainerDashboard