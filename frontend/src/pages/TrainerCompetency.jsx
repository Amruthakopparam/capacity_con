import { useEffect, useState } from "react"
import DashboardLayout from "../layouts/DashboardLayout"
import { trainerNavItems } from "../config/trainerNav"
import { apiGet } from "../utils/api"
import "./TrainerCourses.css"

function TrainerCompetency({ user, onLogout }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    apiGet("/trainer/competency")
      .then((res) => setData(res))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <DashboardLayout user={user} onLogout={onLogout} navItems={trainerNavItems} title="Competency">
      <h2 style={{ marginTop: 0 }}>My Competency</h2>
      <p style={{ color: "var(--text-muted)" }}>
        Competency = 40% work experience + 60% skill test score, calculated per field you've passed.
      </p>

      {error && <div className="tc-error">{error}</div>}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <p style={{ color: "var(--text-muted)" }}>
            Total logged experience: <strong>{data.totalYears} year(s)</strong> (experience score: {data.experienceScore}%)
          </p>

          <div className="tc-item-list">
            {data.fields.map((f) => (
              <div key={f.fieldId} className="tc-item-card">
                <strong>{f.fieldName}</strong>
                {f.testStatus !== "passed" ? (
                  <span style={{ color: "var(--text-muted)" }}>
                    Not yet passed ({f.testStatus.replace("_", " ")}) - no competency score yet
                  </span>
                ) : (
                  <>
                    <span>Skill test score: {f.skillScore}%</span>
                    <span>Experience score: {f.experienceScore}%</span>
                    <strong style={{ fontSize: "1.3rem" }}>
                      Competency: {f.competency}%
                    </strong>
                  </>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </DashboardLayout>
  )
}

export default TrainerCompetency
