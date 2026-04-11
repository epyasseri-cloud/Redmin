import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import EditDateModal from '../components/documents/EditDateModal.jsx'
import {
  deleteDocument,
  fetchMyDocuments,
  updateDocument,
  updateDocumentDate,
} from '../services/api.js'

const TYPE_LABELS = {
  dni_espanol: 'DNI / NIE espanol',
  pasaporte: 'Pasaporte',
  licencia_conducir: 'Licencia de conducir',
  tarjeta_residencia: 'Tarjeta de residencia',
  seguro: 'Seguro / Poliza',
  otro: 'Otro documento',
}

function formatDocumentType(value) {
  return TYPE_LABELS[value] || value || 'Documento'
}

function daysUntil(dateString) {
  const now = new Date()
  const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  const [year, month, day] = (dateString || '').split('-').map(Number)

  if (!year || !month || !day) return null

  const expiryUTC = Date.UTC(year, month - 1, day)
  return Math.floor((expiryUTC - todayUTC) / (1000 * 60 * 60 * 24))
}

function Dashboard() {
  const navigate = useNavigate()
  const { loading, logout, profile, session, user } = useAuth()
  const [documents, setDocuments] = useState([])
  const [isLoadingDocs, setIsLoadingDocs] = useState(true)
  const [docsError, setDocsError] = useState('')
  const [editTarget, setEditTarget] = useState(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [editError, setEditError] = useState('')
  const [busyDocId, setBusyDocId] = useState(null)

  const accessToken = session?.access_token

  const documentsWithStats = useMemo(() => {
    return documents.map((doc) => ({
      ...doc,
      daysRemaining: daysUntil(doc.expiry_date),
    }))
  }, [documents])

  useEffect(() => {
    let active = true

    async function loadDocuments() {
      setIsLoadingDocs(true)
      setDocsError('')

      try {
        const list = await fetchMyDocuments(accessToken)
        if (active) {
          setDocuments(Array.isArray(list) ? list : [])
        }
      } catch (error) {
        if (active) {
          setDocsError(error.message || 'No se pudieron cargar los documentos.')
        }
      } finally {
        if (active) {
          setIsLoadingDocs(false)
        }
      }
    }

    loadDocuments()
    return () => {
      active = false
    }
  }, [accessToken])

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  async function handleToggleActive(doc) {
    setBusyDocId(doc.id)

    try {
      const updated = await updateDocument(doc.id, { active: !doc.active }, accessToken)
      setDocuments((current) => current.map((item) => (item.id === doc.id ? updated : item)))
    } catch (error) {
      setDocsError(error.message || 'No se pudo actualizar el estado del documento.')
    } finally {
      setBusyDocId(null)
    }
  }

  async function handleDelete(doc) {
    setBusyDocId(doc.id)

    try {
      await deleteDocument(doc.id, accessToken)
      setDocuments((current) => current.filter((item) => item.id !== doc.id))
    } catch (error) {
      setDocsError(error.message || 'No se pudo eliminar el documento.')
    } finally {
      setBusyDocId(null)
    }
  }

  async function handleSaveDate(documentId, expiryDate) {
    setIsSavingEdit(true)
    setEditError('')

    try {
      const updated = await updateDocumentDate(documentId, expiryDate, accessToken)
      setDocuments((current) => current.map((item) => (item.id === documentId ? updated : item)))
      setEditTarget(null)
    } catch (error) {
      setEditError(error.message || 'No se pudo guardar la fecha.')
    } finally {
      setIsSavingEdit(false)
    }
  }

  return (
    <main className="app-container">
      <section className="dashboard-card">
        <h1>Dashboard</h1>
        <p>Gestiona tus documentos y controla sus fechas de caducidad.</p>

        <div className="dashboard-meta">
          <ul>
            <li>Usuario autenticado: {user?.email || 'Sin email disponible'}</li>
            <li>Perfil en Supabase: {profile?.email || 'Pendiente de sincronizar'}</li>
            <li>SMS premium: {profile?.has_sms ? 'Activado' : 'Desactivado'}</li>
          </ul>

          <div className="button-row">
            <Link className="button button-primary" to="/new-document">
              <i className="bi bi-file-earmark-plus" aria-hidden="true" />
              Agregar documento
            </Link>
            <button className="button button-outline" type="button" onClick={handleLogout} disabled={loading}>
              <i className="bi bi-box-arrow-right" aria-hidden="true" />
              Cerrar sesion
            </button>
          </div>
        </div>

        <div className="documents-section">
          <h2>Mis documentos</h2>

          {docsError ? (
            <div className="alert alert-error" role="alert">
              {docsError}
            </div>
          ) : null}

          {isLoadingDocs ? <p>Cargando documentos...</p> : null}

          {!isLoadingDocs && documentsWithStats.length === 0 ? (
            <p className="documents-empty">Aun no tienes documentos. Agrega el primero para comenzar.</p>
          ) : null}

          {!isLoadingDocs && documentsWithStats.length > 0 ? (
            <div className="documents-grid">
              {documentsWithStats.map((doc) => (
                <article className="document-card" key={doc.id}>
                  <div className="document-card-header">
                    <h3>{formatDocumentType(doc.tipo_doc)}</h3>
                    <span className={`status-pill ${doc.active ? 'status-active' : 'status-paused'}`}>
                      {doc.active ? 'Activo' : 'Pausado'}
                    </span>
                  </div>

                  <p className="document-meta">
                    Caduca el <strong>{doc.expiry_date}</strong>
                  </p>

                  <p className={`days-remaining ${(doc.daysRemaining ?? 0) < 0 ? 'days-expired' : ''}`}>
                    {doc.daysRemaining === null
                      ? 'Fecha no valida'
                      : doc.daysRemaining < 0
                      ? `Vencido hace ${Math.abs(doc.daysRemaining)} dias`
                      : doc.daysRemaining === 0
                      ? 'Vence hoy'
                      : `Faltan ${doc.daysRemaining} dias`}
                  </p>

                  <div className="button-row">
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={() => {
                        setEditError('')
                        setEditTarget(doc)
                      }}
                      disabled={busyDocId === doc.id}
                    >
                      <i className="bi bi-pencil-square" aria-hidden="true" />
                      Editar fecha
                    </button>

                    <button
                      className="button button-outline"
                      type="button"
                      onClick={() => handleToggleActive(doc)}
                      disabled={busyDocId === doc.id}
                    >
                      <i className={`bi ${doc.active ? 'bi-pause-circle' : 'bi-play-circle'}`} aria-hidden="true" />
                      {doc.active ? 'Pausar' : 'Activar'}
                    </button>

                    <button
                      className="button button-outline"
                      type="button"
                      onClick={() => handleDelete(doc)}
                      disabled={busyDocId === doc.id}
                    >
                      <i className="bi bi-trash" aria-hidden="true" />
                      Eliminar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <EditDateModal
        document={editTarget}
        isSaving={isSavingEdit}
        error={editError}
        onClose={() => setEditTarget(null)}
        onSave={handleSaveDate}
      />
    </main>
  )
}

export default Dashboard