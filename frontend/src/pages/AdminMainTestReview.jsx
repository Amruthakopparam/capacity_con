import { useEffect, useState } from "react"
import DashboardLayout from "../layouts/DashboardLayout"
import { adminNavItems } from "../config/adminNav"
import { apiGet, apiJson } from "../utils/api"
import "./SkillTest.css"

const EMPTY_Q_FORM = { questionText: "", optionA: "", optionB: "", optionC: "", optionD: "", correctOption: "A", marks: 20 }

function toLocalInputValue(dateStr) {
  const d = new Date(dateStr)
  const pad = (n) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function AdminMainTestReview({ user, onLogout }) {
  const [pending, setPending] = useState([])
  const [lookupId, setLookupId] = useState("")
  const [mainTestId, setMainTestId] = useState(null)
  const [mainTest, setMainTest] = useState(null)
  const [questions, setQuestions] = useState([])
  const [totalMarksSoFar, setTotalMarksSoFar] = useState(0)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [qForm, setQForm] = useState(EMPTY_Q_FORM)
  const [editingId, setEditingId] = useState(null)

  const [scheduleForm, setScheduleForm] = useState({ scheduledAt: "", durationMinutes: 60 })

  useEffect(() => {
    loadPending()
  }, [])

  function loadPending() {
    apiGet("/admin/main-tests/pending")
      .then((data) => setPending(data.mainTests || []))
      .catch((err) => setError(err.message))
  }

  function openMainTest(mtId) {
    setMainTestId(mtId)
    setError("")
    setLoading(true)
    apiGet(`/admin/main-tests/${mtId}`)
      .then((data) => {
        setMainTest(data.mainTest)
        setQuestions(data.questions || [])
        setTotalMarksSoFar(data.totalMarksSoFar || 0)
        if (data.mainTest.scheduled_at) {
          setScheduleForm({
            scheduledAt: toLocalInputValue(data.mainTest.scheduled_at),
            durationMinutes: data.mainTest.duration_minutes || 60,
          })
        } else {
          setScheduleForm({ scheduledAt: "", durationMinutes: 60 })
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  function handleLookup(e) {
    e.preventDefault()
    if (!lookupId) return
    openMainTest(Number(lookupId))
  }

  function resetQForm() {
    setQForm(EMPTY_Q_FORM)
    setEditingId(null)
  }

  function startEditQ(q) {
    setEditingId(q.id)
    setQForm({
      questionText: q.question_text,
      optionA: q.option_a,
      optionB: q.option_b,
      optionC: q.option_c,
      optionD: q.option_d,
      correctOption: q.correct_option,
      marks: q.marks,
    })
  }

  async function handleQSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      if (editingId) {
        await apiJson("PUT", `/admin/main-tests/${mainTestId}/questions/${editingId}`, qForm)
      } else {
        await apiJson("POST", `/admin/main-tests/${mainTestId}/questions`, qForm)
      }
      resetQForm()
      openMainTest(mainTestId)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleQDelete(qid) {
    if (!window.confirm("Delete this question?")) return
    try {
      await apiJson("DELETE", `/admin/main-tests/${mainTestId}/questions/${qid}`)
      openMainTest(mainTestId)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleSchedule(e) {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      await apiJson("POST", `/admin/main-tests/${mainTestId}/schedule`, {
        scheduledAt: new Date(scheduleForm.scheduledAt).toISOString(),
        durationMinutes: Number(scheduleForm.durationMinutes),
      })
      openMainTest(mainTestId)
      loadPending()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const canEditQuestions = mainTest && mainTest.status === "pending_review"
  const canSchedule = mainTest && (mainTest.status === "pending_review" || mainTest.status === "scheduled")

  return (
    <DashboardLayout user={user} onLogout={onLogout} navItems={adminNavItems} title="Main Test Review">
      <h2 style={{ marginTop: 0 }}>Main Test Review &amp; Scheduling</h2>
      <p style={{ color: "var(--text-muted)" }}>
        Review trainer-submitted main tests, edit questions, and schedule the synchronized exam for a batch.
      </p>

      {error && <div className="st-error">{error}</div>}

      <h3>Pending Review ({pending.length})</h3>
      {pending.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>No main tests awaiting review.</p>
      ) : (
        <div className="st-question-list">
          {pending.map((mt) => (
            <div key={mt.id} className="st-question-card">
              <p className="st-question-text">
                {mt.course_title} &mdash; {mt.batch_name} (by {mt.trainer_name})
              </p>
              <p>{mt.total_questions} questions, {mt.total_marks} total marks</p>
              <button onClick={() => openMainTest(mt.id)}>Review</button>
            </div>
          ))}
        </div>
      )}

      <h3 style={{ marginTop: "2rem" }}>Or Load by Main Test ID (for rescheduling an already-scheduled test)</h3>
      <form className="st-form" onSubmit={handleLookup}>
        <input
          type="number"
          placeholder="Main Test ID"
          value={lookupId}
          onChange={(e) => setLookupId(e.target.value)}
        />
        <button type="submit">Load</button>
      </form>

      {loading && <p>Loading...</p>}

      {mainTest && (
        <div style={{ marginTop: "2rem" }}>
          <h3>
            {mainTest.course_title} &mdash; {mainTest.batch_name} (Status: {mainTest.status})
          </h3>
          <p>Total marks so far: {totalMarksSoFar} / {mainTest.total_marks}</p>
          {mainTest.scheduled_at && (
            <p>Currently scheduled: {new Date(mainTest.scheduled_at).toLocaleString()} ({mainTest.duration_minutes} min)</p>
          )}

          {canEditQuestions && (
            <>
              <form className="st-form" onSubmit={handleQSubmit}>
                <h4>{editingId ? "Edit Question" : "Add New Question"}</h4>
                <textarea
                  placeholder="Question text"
                  value={qForm.questionText}
                  onChange={(e) => setQForm({ ...qForm, questionText: e.target.value })}
                  required
                />
                <div className="st-options-grid">
                  {["A", "B", "C", "D"].map((letter) => (
                    <div key={letter} className="st-option-row">
                      <span>{letter}</span>
                      <input
                        type="text"
                        placeholder={`Option ${letter}`}
                        value={qForm[`option${letter}`]}
                        onChange={(e) => setQForm({ ...qForm, [`option${letter}`]: e.target.value })}
                        required
                      />
                      <label className="st-radio">
                        <input
                          type="radio"
                          name="adminCorrectOption"
                          checked={qForm.correctOption === letter}
                          onChange={() => setQForm({ ...qForm, correctOption: letter })}
                        />
                        Correct
                      </label>
                    </div>
                  ))}
                </div>
                <label>Marks:</label>
                <input
                  type="number"
                  min="1"
                  value={qForm.marks}
                  onChange={(e) => setQForm({ ...qForm, marks: e.target.value })}
                />
                <div>
                  <button type="submit" disabled={saving}>
                    {saving ? "Saving..." : editingId ? "Update Question" : "Add Question"}
                  </button>
                  {editingId && (
                    <button type="button" className="st-secondary" onClick={resetQForm}>Cancel Edit</button>
                  )}
                </div>
              </form>

              <div className="st-question-list">
                {questions.map((q) => (
                  <div key={q.id} className="st-question-card">
                    <p className="st-question-text">{q.question_text} ({q.marks} marks)</p>
                    <ul className="st-option-list">
                      <li className={q.correct_option === "A" ? "st-correct" : ""}>A. {q.option_a}</li>
                      <li className={q.correct_option === "B" ? "st-correct" : ""}>B. {q.option_b}</li>
                      <li className={q.correct_option === "C" ? "st-correct" : ""}>C. {q.option_c}</li>
                      <li className={q.correct_option === "D" ? "st-correct" : ""}>D. {q.option_d}</li>
                    </ul>
                    <div className="st-question-actions">
                      <button onClick={() => startEditQ(q)}>Edit</button>
                      <button className="st-danger" onClick={() => handleQDelete(q.id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {canSchedule && (
            <form className="st-form" onSubmit={handleSchedule} style={{ marginTop: "2rem" }}>
              <h4>{mainTest.status === "scheduled" ? "Reschedule Exam" : "Schedule Exam"}</h4>
              <label>Scheduled date/time:</label>
              <input
                type="datetime-local"
                value={scheduleForm.scheduledAt}
                onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledAt: e.target.value })}
                required
              />
              <label>Duration (minutes):</label>
              <input
                type="number"
                min="1"
                value={scheduleForm.durationMinutes}
                onChange={(e) => setScheduleForm({ ...scheduleForm, durationMinutes: e.target.value })}
                required
              />
              <button type="submit" disabled={saving}>
                {saving ? "Saving..." : mainTest.status === "scheduled" ? "Reschedule" : "Schedule Exam"}
              </button>
            </form>
          )}
        </div>
      )}
    </DashboardLayout>
  )
}

export default AdminMainTestReview
