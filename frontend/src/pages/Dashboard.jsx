import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'

function Dashboard() {
  const navigate = useNavigate()
  const { loading, logout, profile, user } = useAuth()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <main className="app-container">
      <section className="dashboard-card">
        <h1>Dashboard</h1>
        <p>La ruta esta protegida. Solo usuarios autenticados pueden entrar aqui.</p>

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
      </section>
    </main>
  )
}

export default Dashboard