import { Link, useLocation } from 'react-router-dom'
import './DashboardLayout.css'

function DashboardLayout({ user, onLogout, navItems, title, children }) {
  const location = useLocation()

  return (
    <div className="shell">
      <aside className="shell-sidebar">
        <Link to="/" className="shell-brand">
          <span className="shell-brand-mark">C</span>
          <span className="shell-brand-name">Capacity Connect</span>
        </Link>

        <nav className="shell-nav">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`shell-nav-link ${
                location.pathname === item.to ? 'active' : ''
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="shell-sidebar-foot">
          <p className="shell-user-name">{user?.name}</p>
          <p className="shell-user-role">{user?.role}</p>
        </div>
      </aside>

      <div className="shell-main">
        <header className="shell-topbar">
          <h1>{title}</h1>
          <button className="shell-logout" onClick={onLogout}>
            Logout
          </button>
        </header>

        <main className="shell-content">{children}</main>
      </div>
    </div>
  )
}

export default DashboardLayout