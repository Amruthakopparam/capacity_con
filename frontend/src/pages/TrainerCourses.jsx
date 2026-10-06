import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import DashboardLayout from "../layouts/DashboardLayout"
import { trainerNavItems } from "../config/trainerNav"
import { apiGet, apiJson } from "../utils/api"
import "./TrainerCourses.css"

function TrainerCourses({ user, onLogout }) {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const [passedFields, setPassedFields] = useState([])
  const [fieldsLoading, setFieldsLoading] = useState(true)

  const [form, setForm] = useState({
    title: "",
    description: "",
    level: "beginner",
    fieldId: "",
  })

  function loadCourses() {
    setLoading(true)
    setError("")
    apiGet("/courses/mine")
      .then((data) => setCourses(data.courses || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  function loadPassedFields() {
    setFieldsLoading(true)
    apiGet("/skill-test/fields")
      .then((data) => {
        const passed = (data.fields || []).filter((f) => f.testStatus === "passed")
        setPassedFields(passed)
        if (passed.length > 0) {
          setForm((f) => ({ ...f, fieldId: String(passed[0].fieldId) }))
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setFieldsLoading(false))
  }

  useEffect(() => {
    loadCourses()
    loadPassedFields()
  }, [])

  async function handleCreate(e) {
    e.preventDefault()

    if (!form.fieldId) {
      setError("You need to pass a skill test for at least one field before creating a course.")
      return
    }

    setSaving(true)
    setError("")
    try {
      await apiJson("POST", "/courses", {
        ...form,
        fieldId: Number(form.fieldId),
      })
      setForm((f) => ({ ...f, title: "", description: "", level: "beginner" }))
      setShowForm(false)
      loadCourses()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout user={user} onLogout={onLogout} navItems={trainerNavItems} title="My Courses">
      <div className="tc-header">
        <div>
          <h2 style={{ marginTop: 0 }}>My Courses</h2>
          <p style={{ color: "var(--text-muted)" }}>Create and manage your training courses.</p>
        </div>
        <button
          className="tc-new-btn"
          onClick={() => setShowForm((s) => !s)}
          disabled={fieldsLoading || passedFields.length === 0}
          title={passedFields.length === 0 ? "Pass a skill test to unlock course creation" : ""}
        >
          {showForm ? "Cancel" : "+ New Course"}
        </button>
      </div>

      {error && <div className="tc-error">{error}</div>}

      {!fieldsLoading && passedFields.length === 0 && (
        <div className="tc-error">
          You haven't passed a skill test for any field yet. Pass at least one skill test to start creating courses.
        </div>
      )}

      {showForm && (
        <form className="tc-form" onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="Course title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <textarea
            placeholder="Course description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="tc-level-row">
            <label>Field:</label>
            <select
              value={form.fieldId}
              onChange={(e) => setForm({ ...form, fieldId: e.target.value })}
              required
            >
              {passedFields.map((f) => (
                <option key={f.fieldId} value={f.fieldId}>
                  {f.fieldName}
                </option>
              ))}
            </select>
          </div>
          <div className="tc-level-row">
            <label>Level:</label>
            <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <button type="submit" disabled={saving}>
            {saving ? "Creating..." : "Create Course"}
          </button>
        </form>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : courses.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>You have not created any courses yet.</p>
      ) : (
        <div className="tc-course-grid">
          {courses.map((c) => (
            <Link key={c.id} to={`/trainer-dashboard/courses/${c.id}`} className="tc-course-card">
              <span className={`tc-level-badge tc-level-${c.level}`}>{c.level}</span>
              <h3>{c.title}</h3>
              {c.field_name && <p className="tc-field-tag">{c.field_name}</p>}
              <p>{c.description || "No description provided."}</p>
              <span className="tc-manage-link">Manage course &rarr;</span>
            </Link>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}

export default TrainerCourses
