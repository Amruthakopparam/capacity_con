import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import DashboardLayout from "../layouts/DashboardLayout"
import { traineeNavItems } from "../config/traineeNav"
import { apiJson } from "../utils/api"
import "./TraineeCourses.css"

function TraineeAssessment({ user, onLogout }) {
  const { assessmentId } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [attempt, setAttempt] = useState(null)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    apiJson("POST", `/assessments/${assessmentId}/start`, {})
      .then((data) => setAttempt(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [assessmentId])

  function selectAnswer(questionId, optionKey) {
    setAnswers((prev) => ({ ...prev, [questionId]: optionKey }))
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError("")

    const answerList = Object.entries(answers).map(([questionId, selectedOption]) => ({
      questionId: Number(questionId),
      selectedOption,
    }))

    try {
      const data = await apiJson("POST", `/assessments/${assessmentId}/submit`, {
        attemptId: attempt.attemptId,
        answers: answerList,
      })
      setResult(data.attempt)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout user={user} onLogout={onLogout} navItems={traineeNavItems} title="Assessment">
        <p>Loading...</p>
      </DashboardLayout>
    )
  }

  if (error && !attempt) {
    return (
      <DashboardLayout user={user} onLogout={onLogout} navItems={traineeNavItems} title="Assessment">
        <div className="tr-error">{error}</div>
        <button onClick={() => navigate(-1)}>Go Back</button>
      </DashboardLayout>
    )
  }

  if (result) {
    return (
      <DashboardLayout user={user} onLogout={onLogout} navItems={traineeNavItems} title="Assessment Result">
        <div className="tr-result-card">
          <h2>Assessment Submitted!</h2>
          <p>Your score: {result.score}</p>
          <button onClick={() => navigate(-1)}>Back to Course</button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout user={user} onLogout={onLogout} navItems={traineeNavItems} title={attempt.assessment.title}>
      <h2 style={{ marginTop: 0 }}>{attempt.assessment.title}</h2>
      <p style={{ color: "var(--text-muted)" }}>
        Answered {Object.keys(answers).length} of {attempt.questions.length}
      </p>

      {error && <div className="tr-error">{error}</div>}

      <div className="tr-item-list">
        {attempt.questions.map((q, idx) => (
          <div key={q.id} className="tr-question-card">
            <p className="tr-question-text">
              {idx + 1}. {q.questionText} <span className="tr-marks-tag">({q.marks} mark(s))</span>
            </p>
            <div className="tr-answer-options">
              {q.options.map((opt) => (
                <label key={opt.key} className="tr-answer-option">
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    checked={answers[q.id] === opt.key}
                    onChange={() => selectAnswer(q.id, opt.key)}
                  />
                  {opt.text}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button className="tr-submit-btn" disabled={submitting} onClick={handleSubmit}>
        {submitting ? "Submitting..." : "Submit Assessment"}
      </button>
    </DashboardLayout>
  )
}

export default TraineeAssessment
