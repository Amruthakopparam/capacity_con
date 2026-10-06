import { useEffect, useState } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import DashboardLayout from "../layouts/DashboardLayout"
import { traineeNavItems } from "../config/traineeNav"
import { apiGet } from "../utils/api"
import "./TraineeCourses.css"

function TraineeCourseDetail({ user, onLogout }) {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const [course, setCourse] = useState(null)
  const [tab, setTab] = useState("resources")
  const [resources, setResources] = useState([])
  const [assessments, setAssessments] = useState([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      apiGet(`/courses/${courseId}`),
      apiGet(`/learning-resources/${courseId}`),
      apiGet(`/assessments/course/${courseId}`),
    ])
      .then(([courseData, resourceData, assessmentData]) => {
        setCourse(courseData.course)
        setResources(resourceData.resources || [])
        setAssessments(assessmentData.assessments || [])
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [courseId])

  function assessmentStatus(a) {
    if (a.myLatestAttempt && a.myLatestAttempt.submitted_at) {
      return { label: `Completed - Score: ${a.myLatestAttempt.score}`, canStart: false }
    }
    if (a.myLatestAttempt && !a.myLatestAttempt.submitted_at) {
      return { label: "In progress", canStart: true, resume: true }
    }
    if (new Date(a.deadline) <= new Date()) {
      return { label: "Expired", canStart: false }
    }
    return { label: "Not attempted", canStart: true }
  }

  return (
    <DashboardLayout user={user} onLogout={onLogout} navItems={traineeNavItems} title="Course">
      <Link to="/trainee-dashboard/my-courses" className="tr-back-link">&larr; Back to My Courses</Link>

      {error && <div className="tr-error">{error}</div>}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          {course && (
            <div className="tr-detail-header">
              <span className={`tr-level-badge tr-level-${course.level}`}>{course.level}</span>
              <h2>{course.title}</h2>
              <p>{course.description}</p>
              <p className="tr-trainer-name">Trainer: {course.trainer_name}</p>
            </div>
          )}

          <div className="tr-tabs">
            <button className={tab === "resources" ? "tr-tab-active" : ""} onClick={() => setTab("resources")}>
              Resources ({resources.length})
            </button>
            <button className={tab === "assessments" ? "tr-tab-active" : ""} onClick={() => setTab("assessments")}>
              Assessments ({assessments.length})
            </button>
          </div>

          {tab === "resources" && (
            <div className="tr-item-list">
              {resources.length === 0 ? (
                <p style={{ color: "var(--text-muted)" }}>No resources added yet.</p>
              ) : (
                resources.map((r) => (
                  <div key={r.id} className="tr-item-card">
                    <span className="tr-item-type">{r.type}</span>
                    <a href={r.url} target="_blank" rel="noreferrer">{r.title}</a>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "assessments" && (
            <div className="tr-item-list">
              {assessments.length === 0 ? (
                <p style={{ color: "var(--text-muted)" }}>No assessments available yet.</p>
              ) : (
                assessments.map((a) => {
                  const status = assessmentStatus(a)
                  return (
                    <div key={a.id} className="tr-item-card tr-assessment-card">
                      <div>
                        <strong>{a.title}</strong>
                        <p className="tr-muted-text">Deadline: {new Date(a.deadline).toLocaleString()}</p>
                        <p className="tr-muted-text">{a.num_questions_to_show} questions</p>
                      </div>
                      <div className="tr-assessment-right">
                        <span className="tr-status-tag">{status.label}</span>
                        {status.canStart && (
                          <button onClick={() => navigate(`/trainee-dashboard/assessment/${a.id}`)}>
                            {status.resume ? "Resume" : "Start"}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  )
}

export default TraineeCourseDetail
