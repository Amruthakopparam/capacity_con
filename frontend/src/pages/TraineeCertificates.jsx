import { useEffect, useState } from "react"
import DashboardLayout from "../layouts/DashboardLayout"
import { traineeNavItems } from "../config/traineeNav"
import { apiGet, API_BASE, getToken } from "../utils/api"
import "./TraineeCourses.css"

function TraineeCertificates({ user, onLogout }) {
  const [certificates, setCertificates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [downloadingId, setDownloadingId] = useState(null)

  useEffect(() => {
    apiGet("/certificates/my")
      .then((data) => setCertificates(data.certificates || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleDownload(certId) {
    setDownloadingId(certId)
    setError("")
    try {
      const res = await fetch(`${API_BASE}/certificates/${certId}/download`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to download certificate")
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "certificate.pdf"
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message)
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <DashboardLayout user={user} onLogout={onLogout} navItems={traineeNavItems} title="My Certificates">
      <h2 style={{ marginTop: 0 }}>My Certificates</h2>
      <p style={{ color: "var(--text-muted)" }}>
        Certificates are issued automatically once you pass every assessment in a course.
      </p>

      {error && <div className="tr-error">{error}</div>}

      {loading ? (
        <p>Loading...</p>
      ) : certificates.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>
          You haven't earned any certificates yet. Complete a course's assessments to earn one.
        </p>
      ) : (
        <div className="tr-item-list">
          {certificates.map((c) => (
            <div key={c.id} className="tr-item-card tr-assessment-card">
              <div>
                <strong>{c.course_title}</strong>
                <p className="tr-muted-text">
                  Issued on {new Date(c.issued_at).toLocaleDateString()}
                </p>
              </div>
              <div className="tr-assessment-right">
                <button disabled={downloadingId === c.id} onClick={() => handleDownload(c.id)}>
                  {downloadingId === c.id ? "Downloading..." : "Download PDF"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}

export default TraineeCertificates
