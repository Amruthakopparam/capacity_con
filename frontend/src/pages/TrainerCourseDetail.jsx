import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import DashboardLayout from "../layouts/DashboardLayout"
import { trainerNavItems } from "../config/trainerNav"
import { apiGet, apiJson } from "../utils/api"
import "./TrainerCourses.css"

const MT_EMPTY_FORM = { questionText: "", optionA: "", optionB: "", optionC: "", optionD: "", correctOption: "A", marks: 20 }

function TrainerCourseDetail({ user, onLogout }) {
  const { id } = useParams()
  const [course, setCourse] = useState(null)
  const [tab, setTab] = useState("resources")
  const [error, setError] = useState("")

  const [resources, setResources] = useState([])
  const [questions, setQuestions] = useState([])
  const [assessments, setAssessments] = useState([])

  const [resourceForm, setResourceForm] = useState({ title: "", type: "video", url: "" })
  const [questionForm, setQuestionForm] = useState({
    questionText: "", optionA: "", optionB: "", optionC: "", optionD: "", correctOption: "A", marks: 1,
  })
  const [assessmentForm, setAssessmentForm] = useState({
    title: "", deadline: "", numQuestionsToShow: 5, weekNumber: 1,
  })

  const [saving, setSaving] = useState(false)

  // ---- Main Test state ----
  const [batches, setBatches] = useState([])
  const [batchesLoaded, setBatchesLoaded] = useState(false)
  const [selectedBatchId, setSelectedBatchId] = useState("")
  const [mtStatus, setMtStatus] = useState(null)
  const [mtQuestions, setMtQuestions] = useState([])
  const [mtTotals, setMtTotals] = useState({ totalMarksSoFar: 0, targetTotalMarks: 100 })
  const [mtError, setMtError] = useState("")
  const [mtSaving, setMtSaving] = useState(false)
  const [mtEditingId, setMtEditingId] = useState(null)
  const [mtForm, setMtForm] = useState(MT_EMPTY_FORM)

  useEffect(() => {
    apiGet(`/courses/${id}`).then((data) => setCourse(data.course)).catch((err) => setError(err.message))
    loadResources()
    loadQuestions()
    loadAssessments()
  }, [id])

  function loadResources() {
    apiGet(`/learning-resources/${id}`).then((data) => setResources(data.resources || [])).catch((err) => setError(err.message))
  }

  function loadQuestions() {
    apiGet(`/questions/course/${id}`).then((data) => setQuestions(data.questions || [])).catch((err) => setError(err.message))
  }

  function loadAssessments() {
    apiGet(`/assessments/course/${id}`).then((data) => setAssessments(data.assessments || [])).catch((err) => setError(err.message))
  }

  async function handleAddResource(e) {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      await apiJson("POST", "/learning-resources", { courseId: Number(id), ...resourceForm })
      setResourceForm({ title: "", type: "video", url: "" })
      loadResources()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleAddQuestion(e) {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      await apiJson("POST", "/questions", { courseId: Number(id), ...questionForm })
      setQuestionForm({ questionText: "", optionA: "", optionB: "", optionC: "", optionD: "", correctOption: "A", marks: 1 })
      loadQuestions()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteQuestion(qid) {
    if (!window.confirm("Delete this question?")) return
    try {
      await apiJson("DELETE", `/questions/${qid}`)
      loadQuestions()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleCreateAssessment(e) {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      await apiJson("POST", "/assessments", {
        courseId: Number(id),
        title: assessmentForm.title,
        deadline: assessmentForm.deadline,
        numQuestionsToShow: Number(assessmentForm.numQuestionsToShow),
        weekNumber: Number(assessmentForm.weekNumber),
      })
      setAssessmentForm({ title: "", deadline: "", numQuestionsToShow: 5, weekNumber: 1 })
      loadAssessments()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ---- Main Test functions ----

  function loadBatches() {
    apiGet(`/courses/${id}/batches`)
      .then((data) => {
        const list = data.batches || []
        setBatches(list)
        setBatchesLoaded(true)
        if (list.length > 0 && !selectedBatchId) {
          setSelectedBatchId(String(list[0].id))
        }
      })
      .catch((err) => setMtError(err.message))
  }

  function loadMainTestStatus(batchId) {
    setMtError("")
    apiGet(`/main-tests/batch/${batchId}/trainer-status`)
      .then((data) => {
        if (data.status === "not_created") {
          setMtStatus({ status: "not_created" })
          setMtQuestions([])
          setMtTotals({ totalMarksSoFar: 0, targetTotalMarks: 100 })
        } else {
          setMtStatus(data.mainTest)
          if (data.mainTest.status === "draft") {
            loadMainTestQuestions(batchId)
          } else {
            setMtQuestions([])
          }
        }
      })
      .catch((err) => setMtError(err.message))
  }

  function loadMainTestQuestions(batchId) {
    apiGet(`/main-tests/batch/${batchId}/questions`)
      .then((data) => {
        setMtQuestions(data.questions || [])
        setMtTotals({
          totalMarksSoFar: data.totalMarksSoFar || 0,
          targetTotalMarks: data.targetTotalMarks || 100,
        })
      })
      .catch((err) => setMtError(err.message))
  }

  function handleSelectTab(nextTab) {
    setTab(nextTab)
    if (nextTab === "maintest" && !batchesLoaded) {
      loadBatches()
    }
  }

  useEffect(() => {
    if (tab === "maintest" && selectedBatchId) {
      loadMainTestStatus(selectedBatchId)
      setMtEditingId(null)
      setMtForm(MT_EMPTY_FORM)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBatchId, tab])

  function resetMtForm() {
    setMtForm(MT_EMPTY_FORM)
    setMtEditingId(null)
  }

  function startEditMtQuestion(q) {
    setMtEditingId(q.id)
    setMtForm({
      questionText: q.question_text,
      optionA: q.option_a,
      optionB: q.option_b,
      optionC: q.option_c,
      optionD: q.option_d,
      correctOption: q.correct_option,
      marks: q.marks,
    })
  }

  async function handleMtSubmitForm(e) {
    e.preventDefault()
    setMtSaving(true)
    setMtError("")
    try {
      if (mtEditingId) {
        await apiJson("PUT", `/main-tests/batch/${selectedBatchId}/questions/${mtEditingId}`, mtForm)
      } else {
        await apiJson("POST", `/main-tests/batch/${selectedBatchId}/questions`, mtForm)
      }
      resetMtForm()
      loadMainTestStatus(selectedBatchId)
    } catch (err) {
      setMtError(err.message)
    } finally {
      setMtSaving(false)
    }
  }

  async function handleMtDeleteQuestion(qid) {
    if (!window.confirm("Delete this question?")) return
    try {
      await apiJson("DELETE", `/main-tests/batch/${selectedBatchId}/questions/${qid}`)
      loadMainTestStatus(selectedBatchId)
    } catch (err) {
      setMtError(err.message)
    }
  }

  async function handleSubmitMainTest() {
    if (!window.confirm("Submit the main test for admin review? You will lose access to edit these questions.")) return
    setMtSaving(true)
    setMtError("")
    try {
      await apiJson("POST", `/main-tests/batch/${selectedBatchId}/submit`, {})
      loadMainTestStatus(selectedBatchId)
    } catch (err) {
      setMtError(err.message)
    } finally {
      setMtSaving(false)
    }
  }

  const isDraftEditable = mtStatus && (mtStatus.status === "draft" || mtStatus.status === "not_created")

  return (
    <DashboardLayout user={user} onLogout={onLogout} navItems={trainerNavItems} title="Manage Course">
      <Link to="/trainer-dashboard/courses" className="tc-back-link">&larr; Back to My Courses</Link>

      {course && (
        <div className="tc-detail-header">
          <span className={`tc-level-badge tc-level-${course.level}`}>{course.level}</span>
          <h2>{course.title}</h2>
          <p>{course.description}</p>
        </div>
      )}

      {error && <div className="tc-error">{error}</div>}

      <div className="tc-tabs">
        <button className={tab === "resources" ? "tc-tab-active" : ""} onClick={() => handleSelectTab("resources")}>
          Resources ({resources.length})
        </button>
        <button className={tab === "questions" ? "tc-tab-active" : ""} onClick={() => handleSelectTab("questions")}>
          Questions ({questions.length})
        </button>
        <button className={tab === "assessments" ? "tc-tab-active" : ""} onClick={() => handleSelectTab("assessments")}>
          Assessments ({assessments.length})
        </button>
        <button className={tab === "maintest" ? "tc-tab-active" : ""} onClick={() => handleSelectTab("maintest")}>
          Main Test
        </button>
      </div>

      {tab === "resources" && (
        <div className="tc-tab-panel">
          <form className="tc-form" onSubmit={handleAddResource}>
            <h3>Add Learning Resource</h3>
            <input
              type="text" placeholder="Title" value={resourceForm.title}
              onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })} required
            />
            <select value={resourceForm.type} onChange={(e) => setResourceForm({ ...resourceForm, type: e.target.value })}>
              <option value="video">Video</option>
              <option value="pdf">PDF</option>
              <option value="presentation">Presentation</option>
              <option value="link">Link</option>
            </select>
            <input
              type="url" placeholder="URL" value={resourceForm.url}
              onChange={(e) => setResourceForm({ ...resourceForm, url: e.target.value })} required
            />
            <button type="submit" disabled={saving}>{saving ? "Adding..." : "Add Resource"}</button>
          </form>

          <div className="tc-item-list">
            {resources.map((r) => (
              <div key={r.id} className="tc-item-card">
                <span className="tc-item-type">{r.type}</span>
                <a href={r.url} target="_blank" rel="noreferrer">{r.title}</a>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "questions" && (
        <div className="tc-tab-panel">
          <form className="tc-form" onSubmit={handleAddQuestion}>
            <h3>Add Question</h3>
            <textarea
              placeholder="Question text" value={questionForm.questionText}
              onChange={(e) => setQuestionForm({ ...questionForm, questionText: e.target.value })} required
            />
            <div className="tc-options-grid">
              {["A", "B", "C", "D"].map((letter) => (
                <div key={letter} className="tc-option-row">
                  <span>{letter}</span>
                  <input
                    type="text" placeholder={`Option ${letter}`}
                    value={questionForm[`option${letter}`]}
                    onChange={(e) => setQuestionForm({ ...questionForm, [`option${letter}`]: e.target.value })}
                    required
                  />
                  <label>
                    <input
                      type="radio" name="correctOption" checked={questionForm.correctOption === letter}
                      onChange={() => setQuestionForm({ ...questionForm, correctOption: letter })}
                    />
                    Correct
                  </label>
                </div>
              ))}
            </div>
            <div className="tc-marks-row">
              <label>Marks:</label>
              <input
                type="number" min="1" value={questionForm.marks}
                onChange={(e) => setQuestionForm({ ...questionForm, marks: e.target.value })}
              />
            </div>
            <button type="submit" disabled={saving}>{saving ? "Adding..." : "Add Question"}</button>
          </form>

          <div className="tc-item-list">
            {questions.map((q) => (
              <div key={q.id} className="tc-question-item">
                <p className="tc-question-text">{q.question_text} <span className="tc-marks-tag">{q.marks} mark(s)</span></p>
                <ul>
                  <li className={q.correct_option === "A" ? "tc-correct" : ""}>A. {q.option_a}</li>
                  <li className={q.correct_option === "B" ? "tc-correct" : ""}>B. {q.option_b}</li>
                  <li className={q.correct_option === "C" ? "tc-correct" : ""}>C. {q.option_c}</li>
                  <li className={q.correct_option === "D" ? "tc-correct" : ""}>D. {q.option_d}</li>
                </ul>
                <button className="tc-danger-btn" onClick={() => handleDeleteQuestion(q.id)}>Delete</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "assessments" && (
        <div className="tc-tab-panel">
          <form className="tc-form" onSubmit={handleCreateAssessment}>
            <h3>Create Assessment</h3>
            <p className="tc-hint">You have {questions.length} question(s) in this course. These are practice-only (weekly) assessments.</p>
            <input
              type="text" placeholder="Assessment title" value={assessmentForm.title}
              onChange={(e) => setAssessmentForm({ ...assessmentForm, title: e.target.value })} required
            />
            <label>Week number:</label>
            <input
              type="number" min="1" value={assessmentForm.weekNumber}
              onChange={(e) => setAssessmentForm({ ...assessmentForm, weekNumber: e.target.value })} required
            />
            <label>Deadline:</label>
            <input
              type="datetime-local" value={assessmentForm.deadline}
              onChange={(e) => setAssessmentForm({ ...assessmentForm, deadline: e.target.value })} required
            />
            <label>Number of questions to show:</label>
            <input
              type="number" min="1" value={assessmentForm.numQuestionsToShow}
              onChange={(e) => setAssessmentForm({ ...assessmentForm, numQuestionsToShow: e.target.value })} required
            />
            <button type="submit" disabled={saving}>{saving ? "Creating..." : "Create Assessment"}</button>
          </form>

          <div className="tc-item-list">
            {assessments.map((a) => (
              <div key={a.id} className="tc-item-card">
                <strong>{a.title}</strong>
                {a.week_number && <span> (Week {a.week_number})</span>}
                <span>Deadline: {new Date(a.deadline).toLocaleString()}</span>
                <span>{a.num_questions_to_show} questions shown</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "maintest" && (
        <div className="tc-tab-panel">
          {mtError && <div className="tc-error">{mtError}</div>}

          <div className="tc-level-row">
            <label>Batch:</label>
            <select value={selectedBatchId} onChange={(e) => setSelectedBatchId(e.target.value)}>
              {batches.length === 0 && <option value="">No batches yet</option>}
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({new Date(b.start_date).toLocaleDateString()} - {new Date(b.end_date).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          {!selectedBatchId && (
            <p style={{ color: "var(--text-muted)" }}>
              No batches exist for this course yet. An admin needs to create a batch before you can author a main test.
            </p>
          )}

          {selectedBatchId && mtStatus && (
            <>
              {mtStatus.status !== "draft" && mtStatus.status !== "not_created" && (
                <div className="tc-item-card">
                  <strong>Status: {mtStatus.status}</strong>
                  <p>This main test has been submitted and is no longer editable by you.</p>
                  {mtStatus.scheduled_at && (
                    <p>Scheduled: {new Date(mtStatus.scheduled_at).toLocaleString()} ({mtStatus.duration_minutes} min)</p>
                  )}
                </div>
              )}

              {isDraftEditable && (
                <>
                  <p className="tc-hint">
                    Total marks so far: {mtTotals.totalMarksSoFar} / {mtTotals.targetTotalMarks}
                  </p>

                  <form className="tc-form" onSubmit={handleMtSubmitForm}>
                    <h3>{mtEditingId ? "Edit Question" : "Add Main Test Question"}</h3>
                    <textarea
                      placeholder="Question text"
                      value={mtForm.questionText}
                      onChange={(e) => setMtForm({ ...mtForm, questionText: e.target.value })}
                      required
                    />
                    <div className="tc-options-grid">
                      {["A", "B", "C", "D"].map((letter) => (
                        <div key={letter} className="tc-option-row">
                          <span>{letter}</span>
                          <input
                            type="text"
                            placeholder={`Option ${letter}`}
                            value={mtForm[`option${letter}`]}
                            onChange={(e) => setMtForm({ ...mtForm, [`option${letter}`]: e.target.value })}
                            required
                          />
                          <label>
                            <input
                              type="radio"
                              name="mtCorrectOption"
                              checked={mtForm.correctOption === letter}
                              onChange={() => setMtForm({ ...mtForm, correctOption: letter })}
                            />
                            Correct
                          </label>
                        </div>
                      ))}
                    </div>
                    <div className="tc-marks-row">
                      <label>Marks:</label>
                      <input
                        type="number"
                        min="1"
                        value={mtForm.marks}
                        onChange={(e) => setMtForm({ ...mtForm, marks: e.target.value })}
                      />
                    </div>
                    <button type="submit" disabled={mtSaving}>
                      {mtSaving ? "Saving..." : mtEditingId ? "Update Question" : "Add Question"}
                    </button>
                    {mtEditingId && (
                      <button type="button" onClick={resetMtForm}>Cancel Edit</button>
                    )}
                  </form>

                  <div className="tc-item-list">
                    {mtQuestions.map((q) => (
                      <div key={q.id} className="tc-question-item">
                        <p className="tc-question-text">{q.question_text} <span className="tc-marks-tag">{q.marks} mark(s)</span></p>
                        <ul>
                          <li className={q.correct_option === "A" ? "tc-correct" : ""}>A. {q.option_a}</li>
                          <li className={q.correct_option === "B" ? "tc-correct" : ""}>B. {q.option_b}</li>
                          <li className={q.correct_option === "C" ? "tc-correct" : ""}>C. {q.option_c}</li>
                          <li className={q.correct_option === "D" ? "tc-correct" : ""}>D. {q.option_d}</li>
                        </ul>
                        <button onClick={() => startEditMtQuestion(q)}>Edit</button>
                        <button className="tc-danger-btn" onClick={() => handleMtDeleteQuestion(q.id)}>Delete</button>
                      </div>
                    ))}
                  </div>

                  {mtQuestions.length > 0 && (
                    <button
                      className="tc-new-btn"
                      disabled={mtSaving || mtTotals.totalMarksSoFar !== mtTotals.targetTotalMarks}
                      onClick={handleSubmitMainTest}
                      title={mtTotals.totalMarksSoFar !== mtTotals.targetTotalMarks ? `Total marks must equal ${mtTotals.targetTotalMarks}` : ""}
                    >
                      Submit Main Test for Review
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}
    </DashboardLayout>
  )
}

export default TrainerCourseDetail
