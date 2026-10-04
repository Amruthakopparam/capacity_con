import { useEffect, useRef, useState } from "react"
import DashboardLayout from "../layouts/DashboardLayout"
import { trainerNavItems } from "../config/trainerNav"
import { apiGet, apiJson } from "../utils/api"
import "./SkillTest.css"

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0")
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, "0")
  return `${m}:${s}`
}

function TrainerSkillTest({ user, onLogout }) {
  const [view, setView] = useState("list")
  const [fields, setFields] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [attempt, setAttempt] = useState(null)
  const [answers, setAnswers] = useState({})
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [toast, setToast] = useState("")
  const [result, setResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const halfWarnedRef = useRef(false)
  const fiveMinWarnedRef = useRef(false)
  const timerRef = useRef(null)
  const answersRef = useRef({})
  const viewRef = useRef(view)
  const attemptRef = useRef(null)

  useEffect(() => {
    viewRef.current = view
  }, [view])

  useEffect(() => {
    attemptRef.current = attempt
  }, [attempt])

  useEffect(() => {
    loadFields()
    return () => clearInterval(timerRef.current)
  }, [])

  useEffect(() => {
    answersRef.current = answers
  }, [answers])

  // Warn on tab close / refresh while testing
  useEffect(() => {
    if (view !== "testing") return

    function handleBeforeUnload(e) {
      e.preventDefault()
      e.returnValue = ""
      return ""
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [view])

  // Trap browser back/forward button while testing - exiting forfeits the attempt
  useEffect(() => {
    if (view !== "testing") return

    window.history.pushState(null, "", window.location.href)

    function handlePopState() {
      if (viewRef.current !== "testing") return

      window.history.pushState(null, "", window.location.href)

      const confirmed = window.confirm(
        "Are you sure you want to exit? Your test will be submitted immediately with your current answers and cannot be resumed."
      )

      if (confirmed && attemptRef.current) {
        runSubmit(attemptRef.current.attemptId, attemptRef.current.fieldName, false)
      }
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [view])

  function loadFields() {
    setLoading(true)
    setError("")
    apiGet("/skill-test/fields")
      .then((data) => setFields(data.fields || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  async function handleStart(field) {
    setError("")
    try {
      const data = await apiJson("POST", `/skill-test/${field.fieldId}/start`, {})
      halfWarnedRef.current = false
      fiveMinWarnedRef.current = false

      const initialSeconds = data.remainingSeconds ?? data.timeLimitMinutes * 60
      const totalSeconds = data.timeLimitMinutes * 60

      if (initialSeconds <= totalSeconds / 2) {
        halfWarnedRef.current = true
      }
      if (initialSeconds <= 300) {
        fiveMinWarnedRef.current = true
      }

      setAttempt({
        attemptId: data.attemptId,
        questions: data.questions,
        timeLimitMinutes: data.timeLimitMinutes,
        fieldId: field.fieldId,
        fieldName: field.fieldName,
      })
      setAnswers({})
      answersRef.current = {}
      setRemainingSeconds(initialSeconds)
      setView("testing")
      startTimer(initialSeconds, totalSeconds, data.attemptId, field.fieldName)
    } catch (err) {
      setError(err.message)
      if (err.message && err.message.toLowerCase().includes("timed out")) {
        loadFields()
      }
    }
  }

  function startTimer(initialSeconds, totalSeconds, attemptId, fieldName) {
    clearInterval(timerRef.current)
    let seconds = initialSeconds

    timerRef.current = setInterval(() => {
      seconds -= 1

      if (!halfWarnedRef.current && seconds <= totalSeconds / 2) {
        halfWarnedRef.current = true
        showToast("Halfway through your time. Keep going!")
      }

      if (!fiveMinWarnedRef.current && seconds <= 300) {
        fiveMinWarnedRef.current = true
        showToast("Only 5 minutes remaining!")
      }

      if (seconds <= 0) {
        clearInterval(timerRef.current)
        setRemainingSeconds(0)
        runSubmit(attemptId, fieldName, true)
        return
      }

      setRemainingSeconds(seconds)
    }, 1000)
  }

  function showToast(message) {
    setToast(message)
    setTimeout(() => setToast(""), 6000)
  }

  function selectAnswer(questionId, optionKey) {
    setAnswers((prev) => ({ ...prev, [questionId]: optionKey }))
  }

  async function runSubmit(attemptId, fieldName, auto) {
    if (submitting) return
    setSubmitting(true)
    clearInterval(timerRef.current)

    const answerList = Object.entries(answersRef.current).map(([questionId, selectedOption]) => ({
      questionId: Number(questionId),
      selectedOption,
    }))

    try {
      const data = await apiJson("POST", `/skill-test/attempts/${attemptId}/submit`, {
        answers: answerList,
      })
      setResult({ ...data, fieldName, autoSubmitted: auto })
      setView("result")
    } catch (err) {
      setError(err.message)
      setView("list")
      loadFields()
    } finally {
      setSubmitting(false)
    }
  }

  function handleManualSubmit() {
    if (!attempt) return
    runSubmit(attempt.attemptId, attempt.fieldName, false)
  }

  function handleExitTest() {
    const confirmed = window.confirm(
      "Are you sure you want to exit? Your test will be submitted immediately with your current answers and cannot be resumed."
    )
    if (!confirmed) return
    if (!attempt) return

    runSubmit(attempt.attemptId, attempt.fieldName, false)
  }

  function backToList() {
    setAttempt(null)
    setResult(null)
    setView("list")
    loadFields()
  }

  if (loading) {
    return (
      <DashboardLayout user={user} onLogout={onLogout} navItems={trainerNavItems} title="Skill Test">
        <p>Loading...</p>
      </DashboardLayout>
    )
  }

  if (view === "testing" && attempt) {
    return (
      <div className="st-fullscreen">
        {toast && <div className="st-toast">{toast}</div>}

        <div className="st-fullscreen-header">
          <div>
            <h2>{attempt.fieldName} - Skill Test</h2>
            <p className="st-progress-note">
              Answered {Object.keys(answers).length} of {attempt.questions.length}
            </p>
          </div>
          <div className="st-fullscreen-header-right">
            <div className={`st-timer ${remainingSeconds <= 300 ? "st-timer-danger" : ""}`}>
              {formatTime(remainingSeconds)}
            </div>
            <button className="st-exit-btn" onClick={handleExitTest} disabled={submitting}>
              Exit Test
            </button>
          </div>
        </div>

        <div className="st-fullscreen-body">
          <div className="st-question-list">
            {attempt.questions.map((q, idx) => (
              <div key={q.id} className="st-question-card">
                <p className="st-question-text">
                  {idx + 1}. {q.questionText}
                </p>
                <div className="st-answer-options">
                  {q.options.map((opt) => (
                    <label key={opt.key} className="st-answer-option">
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

          <button className="st-submit-btn" disabled={submitting} onClick={handleManualSubmit}>
            {submitting ? "Submitting..." : "Submit Test"}
          </button>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout user={user} onLogout={onLogout} navItems={trainerNavItems} title="Skill Test">
      {error && <div className="st-error">{error}</div>}

      {view === "list" && (
        <>
          <h2 style={{ marginTop: 0 }}>Your Skill Tests</h2>
          <p style={{ color: "var(--text-muted)" }}>
            Pass the skill test for every selected field to become a verified trainer.
          </p>

          {fields.length === 0 ? (
            <p>No fields selected yet. Complete your profile first.</p>
          ) : (
            <div className="st-field-list">
              {fields.map((f) => {
                const inCooldown = f.cooldownUntil && new Date(f.cooldownUntil) > new Date()
                return (
                  <div key={f.fieldId} className="st-field-card">
                    <div>
                      <h3>{f.fieldName}</h3>
                      <span className={`st-badge st-badge-${f.testStatus}`}>
                        {f.testStatus.replace("_", " ")}
                      </span>
                      {inCooldown && (
                        <p className="st-cooldown">
                          Retry available {new Date(f.cooldownUntil).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <button disabled={f.testStatus === "passed" || inCooldown} onClick={() => handleStart(f)}>
                      {f.testStatus === "passed" ? "Passed" : "Start Test"}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {view === "result" && result && (
        <div className="st-result-card">
          {result.autoSubmitted && (
            <p className="st-autosubmit-note">Your test was submitted automatically.</p>
          )}
          <h2>{result.passed ? "You Passed!" : "Not Passed"}</h2>
          <p>
            Score: {result.score} / {result.totalQuestions} (pass mark: {result.passThreshold})
          </p>
          <p>Field: {result.fieldName}</p>
          {result.verificationStatus === "verified" && (
            <p className="st-verified-note">
              All your fields are now passed - you are a fully verified trainer!
            </p>
          )}
          <button onClick={backToList}>Back to Skill Tests</button>
        </div>
      )}
    </DashboardLayout>
  )
}

export default TrainerSkillTest
