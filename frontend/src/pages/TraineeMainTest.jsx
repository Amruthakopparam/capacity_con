import { useEffect, useRef, useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import DashboardLayout from "../layouts/DashboardLayout"
import { traineeNavItems } from "../config/traineeNav"
import { apiGet, apiJson } from "../utils/api"
import "./TraineeCourses.css"

function formatTime(totalSeconds) {
  if (totalSeconds <= 0) return "0:00"
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

function TraineeMainTest({ user, onLogout }) {
  const { batchId } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [info, setInfo] = useState(null)

  const [attempt, setAttempt] = useState(null)
  const [answers, setAnswers] = useState({})
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [result, setResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const timerRef = useRef(null)

  useEffect(() => {
    loadInfo()
    return () => clearInterval(timerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId])

  function loadInfo() {
    setLoading(true)
    setError("")
    apiGet(`/main-tests/batch/${batchId}`)
      .then((data) => setInfo(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  function startTimer(initialSeconds) {
    setRemainingSeconds(initialSeconds)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  async function handleStart() {
    setError("")
    try {
      const data = await apiJson("POST", `/main-tests/${info.mainTestId}/start`, {})
      setAttempt(data)
      startTimer(data.remainingSeconds)
    } catch (err) {
      setError(err.message)
      loadInfo()
    }
  }

  function selectAnswer(questionId, optionKey) {
    setAnswers((prev) => ({ ...prev, [questionId]: optionKey }))
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError("")
    clearInterval(timerRef.current)

    const answerList = Object.entries(answers).map(([questionId, selectedOption]) => ({
      questionId: Number(questionId),
      selectedOption,
    }))

    try {
      const data = await apiJson("POST", `/main-tests/${info.mainTestId}/submit`, {
        attemptId: attempt.attemptId,
        answers: answerList,
      })
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    if (attempt && remainingSeconds === 0 && !result && !submitting) {
      handleSubmit()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSeconds])

  if (loading) {
    return (
      <DashboardLayout user={user} onLogout={onLogout} navItems={traineeNavItems} title="Main Test">
        <p>Loading...</p>
      </DashboardLayout>
    )
  }

  if (result) {
    return (
      <DashboardLayout user={user} onLogout={onLogout} navItems={traineeNavItems} title="Main Test Result">
        <div className="tr-result-card">
          <h2>Main Test Submitted!</h2>
          <p>Your score: {result.score} / {result.totalMarks}</p>
          <p>{result.passed ? "You passed!" : "You did not reach the passing threshold."}</p>
          {result.certificate && <p>A certificate has been issued based on your combined performance.</p>}
          <button onClick={() => navigate("/trainee-dashboard/my-courses")}>Back to My Courses</button>
        </div>
      </DashboardLayout>
    )
  }

  if (attempt) {
    return (
      <DashboardLayout user={user} onLogout={onLogout} navItems={traineeNavItems} title="Main Test">
        <div className="tr-detail-header">
          <h2>Main Test</h2>
          <p style={{ color: "var(--text-muted)" }}>
            Time remaining: <strong>{formatTime(remainingSeconds)}</strong>
          </p>
          <p style={{ color: "var(--text-muted)" }}>
            Answered {Object.keys(answers).length} of {attempt.questions.length}
          </p>
        </div>

        {error && <div className="tr-error">{error}</div>}

        <div className="tr-item-list">
          {attempt.questions.map((q, idx) => (
            <div key={q.id} className="tr-question-card">
              <p className="tr-question-text">
                {idx + 1}. {q.questionText} <span className="tr-marks-tag">({q.marks} marks)</span>
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
          {submitting ? "Submitting..." : "Submit Main Test"}
        </button>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout user={user} onLogout={onLogout} navItems={traineeNavItems} title="Main Test">
      <Link to="/trainee-dashboard/my-courses" className="tr-back-link">&larr; Back to My Courses</Link>

      {error && <div className="tr-error">{error}</div>}

      {info && info.status === "not_scheduled" && (
        <p style={{ color: "var(--text-muted)" }}>The main test for this batch has not been scheduled yet.</p>
      )}

      {info && info.status === "scheduled" && (
        <div className="tr-item-card">
          <h3>Main Test</h3>
          <p>Scheduled for: {new Date(info.scheduledAt).toLocaleString()}</p>
          <p>Duration: {info.durationMinutes} minutes</p>
          <p>Total marks: {info.totalMarks} ({info.totalQuestions} questions)</p>
          <p>Passing: {info.passPercentage}%</p>

          {info.myAttempt && info.myAttempt.submitted_at ? (
            <p>
              <strong>Already submitted.</strong> Score: {info.myAttempt.score} / {info.totalMarks}{" "}
              ({info.myAttempt.passed ? "Passed" : "Not passed"})
            </p>
          ) : info.windowStatus === "upcoming" ? (
            <p>This test has not opened yet.</p>
          ) : info.windowStatus === "open" ? (
            <button onClick={handleStart}>
              {info.myAttempt ? "Resume Main Test" : "Start Main Test"}
            </button>
          ) : (
            <p>The test window has closed.</p>
          )}
        </div>
      )}
    </DashboardLayout>
  )
}

export default TraineeMainTest
