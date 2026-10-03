import { useEffect, useState } from 'react'
import DashboardLayout from '../layouts/DashboardLayout'
import { adminNavItems } from '../config/adminNav'
import { API_BASE, apiGet, apiJson } from '../utils/api'
import './AdminTrainerReview.css'

function AdminTrainerReview({ user, onLogout }) {
  const [trainers, setTrainers] = useState([])
  const [loadingList, setLoadingList] = useState(true)
  const [listError, setListError] = useState('')

  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [detailError, setDetailError] = useState('')

  const [rejectReason, setRejectReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')

  async function loadList() {
    setLoadingList(true)
    setListError('')
    try {
      const data = await apiGet('/admin/trainers?status=pending_review')
      setTrainers(data.trainers)
    } catch (err) {
      setListError(err.message)
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    loadList()
  }, [])

  async function openTrainer(id) {
    setSelectedId(id)
    setDetail(null)
    setDetailError('')
    setShowRejectForm(false)
    setRejectReason('')
    setActionError('')
    setActionSuccess('')
    setLoadingDetail(true)
    try {
      const data = await apiGet(`/admin/trainers/${id}`)
      setDetail(data)
    } catch (err) {
      setDetailError(err.message)
    } finally {
      setLoadingDetail(false)
    }
  }

  async function approve() {
    setActionError('')
    setActionSuccess('')
    setActionLoading(true)
    try {
      await apiJson('POST', `/admin/trainers/${selectedId}/approve`)
      setActionSuccess('Trainer approved.')
      setDetail(null)
      setSelectedId(null)
      await loadList()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function reject(e) {
    e.preventDefault()
    if (!rejectReason.trim()) {
      setActionError('Please provide a reason for rejection.')
      return
    }
    setActionError('')
    setActionSuccess('')
    setActionLoading(true)
    try {
      await apiJson('POST', `/admin/trainers/${selectedId}/reject`, {
        reason: rejectReason.trim(),
      })
      setActionSuccess('Trainer rejected.')
      setDetail(null)
      setSelectedId(null)
      setShowRejectForm(false)
      setRejectReason('')
      await loadList()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      navItems={adminNavItems}
      title="Trainer Review"
    >
      <div className="atr-layout">
        <div className="atr-list">
          <h3>Pending Trainers</h3>
          {loadingList && <p>Loading...</p>}
          {listError && <div className="atr-alert error">{listError}</div>}
          {!loadingList && trainers.length === 0 && (
            <p className="atr-muted">No trainers waiting for review.</p>
          )}
          {trainers.map((t) => (
            <button
              key={t.id}
              className={`atr-trainer-row ${
                selectedId === t.id ? 'active' : ''
              }`}
              onClick={() => openTrainer(t.id)}
            >
              <strong>{t.name}</strong>
              <span>{t.email}</span>
              <span className="atr-date">
                Submitted {new Date(t.submittedAt).toLocaleDateString()}
              </span>
            </button>
          ))}
        </div>

        <div className="atr-detail">
          {!selectedId && (
            <p className="atr-muted">Select a trainer to review.</p>
          )}

          {loadingDetail && <p>Loading...</p>}
          {detailError && <div className="atr-alert error">{detailError}</div>}

          {detail && (
            <>
              <h3>{detail.name}</h3>
              <p className="atr-muted">{detail.email}</p>

              {actionError && (
                <div className="atr-alert error">{actionError}</div>
              )}
              {actionSuccess && (
                <div className="atr-alert success">{actionSuccess}</div>
              )}

              <section className="atr-section">
                <h4>Teaching fields</h4>
                {detail.fields.length === 0 ? (
                  <p className="atr-muted">No fields selected.</p>
                ) : (
                  <ul>
                    {detail.fields.map((f) => (
                      <li key={f.id}>{f.name}</li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="atr-section">
                <h4>Work experience</h4>
                {detail.experiences.length === 0 ? (
                  <p className="atr-muted">No experience listed.</p>
                ) : (
                  detail.experiences.map((e) => (
                    <div key={e.id} className="atr-exp-row">
                      <strong>{e.roleTitle}</strong> at {e.organization} ·{' '}
                      {e.years} yrs
                    </div>
                  ))
                )}
              </section>

              <section className="atr-section">
                <h4>Resume</h4>
                {detail.resume ? (
                  <a
                    href={`${API_BASE.replace('/api', '')}${detail.resume.fileUrl}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View resume
                  </a>
                ) : (
                  <p className="atr-muted">No resume uploaded.</p>
                )}
              </section>

              <section className="atr-section atr-actions">
                <button
                  className="atr-btn atr-btn-approve"
                  onClick={approve}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Working...' : 'Approve'}
                </button>
                <button
                  className="atr-btn atr-btn-reject"
                  onClick={() => setShowRejectForm((s) => !s)}
                  disabled={actionLoading}
                >
                  Reject
                </button>
              </section>

              {showRejectForm && (
                <form className="atr-reject-form" onSubmit={reject}>
                  <textarea
                    placeholder="Reason for rejection (shown to trainer)"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                  />
                  <button
                    className="atr-btn atr-btn-reject"
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Submitting...' : 'Confirm rejection'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

export default AdminTrainerReview