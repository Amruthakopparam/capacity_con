import { useEffect, useState } from 'react'
import DashboardLayout from '../layouts/DashboardLayout'
import { trainerNavItems } from '../config/trainerNav'
import { API_BASE, getToken, apiGet, apiJson } from '../utils/api'
import './TrainerVerification.css'

const STATUS_LABELS = {
  profile_incomplete: 'Not submitted yet',
  pending_review: 'Pending admin review',
  rejected: 'Rejected — changes needed',
  test_pending: 'Ready for skill test',
  test_in_progress: 'Skill test in progress',
  test_failed: 'Skill test not passed',
  verified: 'Verified',
}

function TrainerVerification({ user, onLogout }) {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [profile, setProfile] = useState(null)
  const [allFields, setAllFields] = useState([])
  const [selectedFieldIds, setSelectedFieldIds] = useState([])

  const [savingFields, setSavingFields] = useState(false)
  const [expRole, setExpRole] = useState('')
  const [expOrg, setExpOrg] = useState('')
  const [expYears, setExpYears] = useState('')
  const [savingExp, setSavingExp] = useState(false)
  const [resumeFile, setResumeFile] = useState(null)
  const [uploadingResume, setUploadingResume] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')

  async function loadAll() {
    setLoading(true)
    setLoadError('')
    try {
      const [profileData, fieldsData] = await Promise.all([
        apiGet('/trainer/profile'),
        apiGet('/skill-fields'),
      ])
      setProfile(profileData)
      setAllFields(fieldsData.fields)
      setSelectedFieldIds(profileData.fields.map((f) => f.id))
    } catch (err) {
      setLoadError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const editable =
    profile &&
    ['profile_incomplete', 'rejected'].includes(profile.verificationStatus)

  function toggleField(id) {
    setSelectedFieldIds((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    )
  }

  function clearMessages() {
    setActionError('')
    setActionSuccess('')
  }

  async function saveFields() {
    clearMessages()
    setSavingFields(true)
    try {
      await apiJson('PUT', '/trainer/fields', { fieldIds: selectedFieldIds })
      setActionSuccess('Teaching fields saved.')
      await loadAll()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setSavingFields(false)
    }
  }

  async function addExperience(e) {
    e.preventDefault()
    clearMessages()

    if (!expRole.trim() || !expOrg.trim() || expYears === '') {
      setActionError('Fill in role, organization and years.')
      return
    }

    setSavingExp(true)
    try {
      await apiJson('POST', '/trainer/experiences', {
        roleTitle: expRole.trim(),
        organization: expOrg.trim(),
        years: Number(expYears),
      })
      setExpRole('')
      setExpOrg('')
      setExpYears('')
      setActionSuccess('Experience added.')
      await loadAll()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setSavingExp(false)
    }
  }

  async function removeExperience(id) {
    clearMessages()
    try {
      await apiJson('DELETE', `/trainer/experiences/${id}`)
      setActionSuccess('Experience removed.')
      await loadAll()
    } catch (err) {
      setActionError(err.message)
    }
  }

  async function uploadResume(e) {
    e.preventDefault()
    clearMessages()

    if (!resumeFile) {
      setActionError('Choose a PDF file first.')
      return
    }

    setUploadingResume(true)
    try {
      const form = new FormData()
      form.append('document', resumeFile)
      form.append('document_type', 'resume')

      const res = await fetch(`${API_BASE}/documents/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')

      setActionSuccess('Resume uploaded.')
      setResumeFile(null)
      await loadAll()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setUploadingResume(false)
    }
  }

  async function submitForReview() {
    clearMessages()
    setSubmitting(true)
    try {
      await apiJson('POST', '/trainer/submit')
      setActionSuccess('Submitted for review.')
      await loadAll()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      navItems={trainerNavItems}
      title="Trainer Verification"
    >
      {loading && <p>Loading...</p>}
      {loadError && <div className="tv-alert error">{loadError}</div>}

      {!loading && profile && (
        <>
          <div className="tv-status">
            <span className="tv-status-badge">
              {STATUS_LABELS[profile.verificationStatus] ||
                profile.verificationStatus}
            </span>
            {profile.reviewReason && (
              <p className="tv-reason">
                Admin feedback: {profile.reviewReason}
              </p>
            )}
          </div>

          {actionError && <div className="tv-alert error">{actionError}</div>}
          {actionSuccess && (
            <div className="tv-alert success">{actionSuccess}</div>
          )}

          {!editable && profile.verificationStatus === 'pending_review' && (
            <p className="tv-muted">
              Your application is with the admin team. You can edit it again
              only if it is sent back for changes.
            </p>
          )}

          <section className="tv-section">
            <h3>Fields you will teach</h3>
            <div className="tv-field-grid">
              {allFields.map((f) => (
                <label key={f.id} className="tv-field-option">
                  <input
                    type="checkbox"
                    disabled={!editable}
                    checked={selectedFieldIds.includes(f.id)}
                    onChange={() => toggleField(f.id)}
                  />
                  {f.name}
                </label>
              ))}
            </div>
            {editable && (
              <button
                className="tv-btn"
                onClick={saveFields}
                disabled={savingFields}
              >
                {savingFields ? 'Saving...' : 'Save fields'}
              </button>
            )}
          </section>

          <section className="tv-section">
            <h3>Work experience</h3>

            {profile.experiences.length === 0 && (
              <p className="tv-muted">No experience added yet.</p>
            )}

            {profile.experiences.map((exp) => (
              <div key={exp.id} className="tv-exp-row">
                <div>
                  <strong>{exp.roleTitle}</strong> at {exp.organization}
                  <span className="tv-exp-years"> · {exp.years} yrs</span>
                </div>
                {editable && (
                  <button
                    className="tv-link-btn"
                    onClick={() => removeExperience(exp.id)}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}

            {editable && (
              <form className="tv-exp-form" onSubmit={addExperience}>
                <input
                  placeholder="Role (e.g. Research Scientist)"
                  value={expRole}
                  onChange={(e) => setExpRole(e.target.value)}
                />
                <input
                  placeholder="Organization"
                  value={expOrg}
                  onChange={(e) => setExpOrg(e.target.value)}
                />
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="60"
                  placeholder="Years"
                  value={expYears}
                  onChange={(e) => setExpYears(e.target.value)}
                />
                <button className="tv-btn" disabled={savingExp}>
                  {savingExp ? 'Adding...' : 'Add experience'}
                </button>
              </form>
            )}
          </section>

          <section className="tv-section">
            <h3>Resume</h3>
            {profile.resume ? (
              <p className="tv-muted">
                Uploaded on{' '}
                {new Date(profile.resume.uploadedAt).toLocaleDateString()} ·{' '}
                {profile.resume.verificationStatus}
              </p>
            ) : (
              <p className="tv-muted">No resume uploaded.</p>
            )}

            {editable && (
              <form className="tv-resume-form" onSubmit={uploadResume}>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) =>
                    setResumeFile(e.target.files[0] || null)
                  }
                />
                <button className="tv-btn" disabled={uploadingResume}>
                  {uploadingResume ? 'Uploading...' : 'Upload resume'}
                </button>
              </form>
            )}
          </section>

          {editable && (
            <section className="tv-section">
              <button
                className="tv-btn tv-btn-primary"
                onClick={submitForReview}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit for review'}
              </button>
              <p className="tv-muted" style={{ marginTop: 8 }}>
                You need at least one field, and either a work experience or
                a resume, before submitting.
              </p>
            </section>
          )}
        </>
      )}
    </DashboardLayout>
  )
}

export default TrainerVerification