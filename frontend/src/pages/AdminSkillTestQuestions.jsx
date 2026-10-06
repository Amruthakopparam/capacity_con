import { useEffect, useState } from "react"
import DashboardLayout from "../layouts/DashboardLayout"
import { adminNavItems } from "../config/adminNav"
import { apiGet, apiJson } from "../utils/api"
import "./SkillTest.css"

const EMPTY_FORM = {
  questionText: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correctOption: "A",
}

function AdminSkillTestQuestions({ user, onLogout }) {
  const [fields, setFields] = useState([])
  const [selectedFieldId, setSelectedFieldId] = useState("")
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiGet("/skill-fields")
      .then((data) => setFields(data.fields || []))
      .catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    if (!selectedFieldId) {
      setQuestions([])
      return
    }
    loadQuestions(selectedFieldId)
  }, [selectedFieldId])

  function loadQuestions(fieldId) {
    setLoading(true)
    setError("")
    apiGet(`/admin/skill-fields/${fieldId}/questions`)
      .then((data) => setQuestions(data.questions || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  function resetForm() {
    setForm(EMPTY_FORM)
    setEditingId(null)
  }

  function startEdit(q) {
    setEditingId(q.id)
    setForm({
      questionText: q.question_text,
      optionA: q.option_a,
      optionB: q.option_b,
      optionC: q.option_c,
      optionD: q.option_d,
      correctOption: q.correct_option,
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selectedFieldId) {
      setError("Select a field first")
      return
    }
    setSaving(true)
    setError("")
    try {
      if (editingId) {
        await apiJson("PUT", `/admin/skill-test-questions/${editingId}`, form)
      } else {
        await apiJson("POST", `/admin/skill-fields/${selectedFieldId}/questions`, form)
      }
      resetForm()
      loadQuestions(selectedFieldId)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Deactivate this question?")) return
    try {
      await apiJson("DELETE", `/admin/skill-test-questions/${id}`)
      loadQuestions(selectedFieldId)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <DashboardLayout user={user} onLogout={onLogout} navItems={adminNavItems} title="Skill Test Questions">
      <h2 style={{ marginTop: 0 }}>Manage Skill Test Questions</h2>
      <p style={{ color: "var(--text-muted)" }}>
        Author MCQ questions per field. Trainers are tested from this pool once approved.
      </p>

      {error && <div className="st-error">{error}</div>}

      <div className="st-field-select">
        <label>Field:</label>
        <select
          value={selectedFieldId}
          onChange={(e) => {
            resetForm()
            setSelectedFieldId(e.target.value)
          }}
        >
          <option value="">-- Select a field --</option>
          {fields.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      {selectedFieldId && (
        <>
          <form className="st-form" onSubmit={handleSubmit}>
            <h3>{editingId ? "Edit Question" : "Add New Question"}</h3>
            <textarea
              placeholder="Question text"
              value={form.questionText}
              onChange={(e) => setForm({ ...form, questionText: e.target.value })}
              required
            />
            <div className="st-options-grid">
              {["A", "B", "C", "D"].map((letter) => (
                <div key={letter} className="st-option-row">
                  <span>{letter}</span>
                  <input
                    type="text"
                    placeholder={`Option ${letter}`}
                    value={form[`option${letter}`]}
                    onChange={(e) => setForm({ ...form, [`option${letter}`]: e.target.value })}
                    required
                  />
                  <label className="st-radio">
                    <input
                      type="radio"
                      name="correctOption"
                      checked={form.correctOption === letter}
                      onChange={() => setForm({ ...form, correctOption: letter })}
                    />
                    Correct
                  </label>
                </div>
              ))}
            </div>
            <div className="st-form-actions">
              <button type="submit" disabled={saving}>
                {saving ? "Saving..." : editingId ? "Update Question" : "Add Question"}
              </button>
              {editingId && (
                <button type="button" className="st-secondary" onClick={resetForm}>
                  Cancel Edit
                </button>
              )}
            </div>
          </form>

          <h3>Existing Questions ({questions.length})</h3>
          {loading ? (
            <p>Loading...</p>
          ) : questions.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>No active questions yet for this field.</p>
          ) : (
            <div className="st-question-list">
              {questions.map((q) => (
                <div key={q.id} className="st-question-card">
                  <p className="st-question-text">{q.question_text}</p>
                  <ul className="st-option-list">
                    <li className={q.correct_option === "A" ? "st-correct" : ""}>A. {q.option_a}</li>
                    <li className={q.correct_option === "B" ? "st-correct" : ""}>B. {q.option_b}</li>
                    <li className={q.correct_option === "C" ? "st-correct" : ""}>C. {q.option_c}</li>
                    <li className={q.correct_option === "D" ? "st-correct" : ""}>D. {q.option_d}</li>
                  </ul>
                  <div className="st-question-actions">
                    <button onClick={() => startEdit(q)}>Edit</button>
                    <button className="st-danger" onClick={() => handleDelete(q.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  )
}

export default AdminSkillTestQuestions
