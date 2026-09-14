import { useNavigate } from 'react-router-dom'

function HomePage() {
  const navigate = useNavigate()

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
              onClick={() =>
                navigate('/login/trainee')
              }
            >
              Trainee Login
            </button>

            <button
              onClick={() =>
                navigate('/login/trainer')
              }
            >
              Trainer Login
            </button>

            <button
              onClick={() =>
                navigate('/login/admin')
              }
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

export default HomePage