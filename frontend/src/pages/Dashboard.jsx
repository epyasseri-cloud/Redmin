import { useNavigate } from 'react-router-dom'
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
            <button className="button button-primary" type="button" onClick={handleLogout} disabled={loading}>
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