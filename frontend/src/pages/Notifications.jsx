import { useEffect, useState } from "react"
import DashboardLayout from "../layouts/DashboardLayout"
import { apiGet, apiJson } from "../utils/api"
import "./Notifications.css"

function Notifications({ user, onLogout, navItems, title }) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  function load() {
    setLoading(true)
    setError("")
    apiGet("/notifications")
      .then((data) => {
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  async function markRead(id) {
    try {
      await apiJson("POST", `/notifications/${id}/read`, {})
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function markAllRead() {
    try {
      await apiJson("POST", "/notifications/read-all", {})
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <DashboardLayout user={user} onLogout={onLogout} navItems={navItems} title={title}>
      <div className="notif-header">
        <h2 style={{ marginTop: 0 }}>Notifications</h2>
        {unreadCount > 0 && (
          <button className="notif-mark-all" onClick={markAllRead}>
            Mark all as read ({unreadCount})
          </button>
        )}
      </div>

      {error && <div className="notif-error">{error}</div>}

      {loading ? (
        <p>Loading...</p>
      ) : notifications.length === 0 ? (
        <p className="notif-empty">No notifications yet. Updates about your verification, tests and courses will appear here.</p>
      ) : (
        <div className="notif-list">
          {notifications.map((n) => (
            <div key={n.id} className={`notif-item ${n.is_read ? "" : "notif-unread"} notif-${n.type}`}>
              <div className="notif-content">
                <p className="notif-title">{n.title}</p>
                <p className="notif-message">{n.message}</p>
                <p className="notif-time">{new Date(n.created_at).toLocaleString()}</p>
              </div>
              {!n.is_read && (
                <button className="notif-read-btn" onClick={() => markRead(n.id)}>
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}

export default Notifications
