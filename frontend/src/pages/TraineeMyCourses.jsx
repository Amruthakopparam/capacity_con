import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import DashboardLayout from "../layouts/DashboardLayout"
import { traineeNavItems } from "../config/traineeNav"
import { apiGet } from "../utils/api"
import "./TraineeCourses.css"

function TraineeMyCourses({ user, onLogout }) {
  const [enrollments, setEnrollments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    apiGet("/enrollments/my")
      .then((data) => setEnrollments(data.enrollments || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <DashboardLayout user={user} onLogout={onLogout} navItems={traineeNavItems} title="My Courses">
      <h2 style={{ marginTop: 0 }}>My Courses</h2>
      <p style={{ color: "var(--text-muted)" }}>Courses you are enrolled in.</p>

      {error && <div className="tr-error">{error}</div>}

      {loading ? (
        <p>Loading...</p>
      ) : enrollments.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>
          You have not enrolled in any courses yet. Go to Browse Courses to get started.
        </p>
      ) : (
        <div className="tr-course-grid">
          {enrollments.map((e) => (
            <Link key={e.enrollment_id} to={`/trainee-dashboard/courses/${e.course_id}`} className="tr-course-card tr-course-link">
              <span className={`tr-level-badge tr-level-${e.level}`}>{e.level}</span>
              <h3>{e.title}</h3>
              <p className="tr-trainer-name">By {e.trainer_name}</p>
              <p>{e.description || "No description provided."}</p>
              <span className="tr-manage-link">View course &rarr;</span>
            </Link>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}

export default TraineeMyCourses
