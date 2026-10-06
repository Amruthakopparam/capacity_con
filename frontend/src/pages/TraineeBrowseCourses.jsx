import { useEffect, useState } from "react"
import DashboardLayout from "../layouts/DashboardLayout"
import { traineeNavItems } from "../config/traineeNav"
import { apiGet, apiJson } from "../utils/api"
import "./TraineeCourses.css"

function TraineeBrowseCourses({ user, onLogout }) {
  const [courses, setCourses] = useState([])
  const [myEnrollments, setMyEnrollments] = useState([])
  const [levelFilter, setLevelFilter] = useState("")
  const [fieldFilter, setFieldFilter] = useState("")
  const [allFields, setAllFields] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [enrollingId, setEnrollingId] = useState(null)

  function loadData() {
    setLoading(true)
    setError("")

    const params = new URLSearchParams()
    if (levelFilter) params.set("level", levelFilter)
    if (fieldFilter) params.set("fieldId", fieldFilter)
    const query = params.toString()
    const coursesUrl = query ? `/courses?${query}` : "/courses"

    Promise.all([apiGet(coursesUrl), apiGet("/enrollments/my")])
      .then(([coursesData, enrollData]) => {
        setCourses(coursesData.courses || [])
        setMyEnrollments(enrollData.enrollments || [])
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    apiGet("/skill-fields")
      .then((data) => setAllFields(data.fields || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    loadData()
  }, [levelFilter, fieldFilter])

  const enrolledCourseIds = new Set(myEnrollments.map((e) => e.course_id))

  async function handleEnroll(courseId) {
    setEnrollingId(courseId)
    setError("")
    setMessage("")
    try {
      await apiJson("POST", "/enrollments", { courseId })
      setMessage("Successfully enrolled!")
      loadData()
    } catch (err) {
      setError(err.message)
    } finally {
      setEnrollingId(null)
    }
  }

  return (
    <DashboardLayout user={user} onLogout={onLogout} navItems={traineeNavItems} title="Browse Courses">
      <h2 style={{ marginTop: 0 }}>Browse Courses</h2>
      <p style={{ color: "var(--text-muted)" }}>Find courses to build your skills.</p>

      {error && <div className="tr-error">{error}</div>}
      {message && <div className="tr-success">{message}</div>}

      <div className="tr-filter-row">
        <label>Filter by level:</label>
        <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
          <option value="">All levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>

        <label>Filter by field:</label>
        <select value={fieldFilter} onChange={(e) => setFieldFilter(e.target.value)}>
          <option value="">All fields</option>
          {allFields.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : courses.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>No courses available yet.</p>
      ) : (
        <div className="tr-course-grid">
          {courses.map((c) => {
            const isEnrolled = enrolledCourseIds.has(c.id)
            return (
              <div key={c.id} className="tr-course-card">
                <span className={`tr-level-badge tr-level-${c.level}`}>{c.level}</span>
                <h3>{c.title}</h3>
                {c.field_name && <p className="tr-field-tag">{c.field_name}</p>}
                <p className="tr-trainer-name">By {c.trainer_name}</p>
                <p>{c.description || "No description provided."}</p>
                <button
                  disabled={isEnrolled || enrollingId === c.id}
                  onClick={() => handleEnroll(c.id)}
                >
                  {isEnrolled ? "Already Enrolled" : enrollingId === c.id ? "Enrolling..." : "Enroll"}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </DashboardLayout>
  )
}

export default TraineeBrowseCourses
