import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import DashboardLayout from "../layouts/DashboardLayout"
import { trainerNavItems } from "../config/trainerNav"
import { apiGet, apiJson } from "../utils/api"
import "./TrainerCourses.css"

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
    title: "", deadline: "", numQuestionsToShow: 5,
  })

  const [saving, setSaving] = useState(false)

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
      })
      setAssessmentForm({ title: "", deadline: "", numQuestionsToShow: 5 })
      loadAssessments()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

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
        <button className={tab === "resources" ? "tc-tab-active" : ""} onClick={() => setTab("resources")}>
          Resources ({resources.length})
        </button>
        <button className={tab === "questions" ? "tc-tab-active" : ""} onClick={() => setTab("questions")}>
          Questions ({questions.length})
        </button>
        <button className={tab === "assessments" ? "tc-tab-active" : ""} onClick={() => setTab("assessments")}>
          Assessments ({assessments.length})
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
            <p className="tc-hint">You have {questions.length} question(s) in this course.</p>
            <input
              type="text" placeholder="Assessment title" value={assessmentForm.title}
              onChange={(e) => setAssessmentForm({ ...assessmentForm, title: e.target.value })} required
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
                <span>Deadline: {new Date(a.deadline).toLocaleString()}</span>
                <span>{a.num_questions_to_show} questions shown</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

export default TrainerCourseDetail
