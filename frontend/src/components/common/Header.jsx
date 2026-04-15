import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'

function Header() {
  const navigate = useNavigate()
  const { loading, profile, user, logout } = useAuth()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <header className="app-header">
      <NavLink className="brand-link" to="/">
        <span className="brand-icon" aria-hidden="true">
          <i className="bi bi-file-earmark-lock2" />
        </span>
        DocRemind
      </NavLink>

      <nav className="nav-links">
        {!user && (
          <>
            <NavLink className="nav-link" to="/login">
              Iniciar sesion
            </NavLink>
            <NavLink className="nav-link" to="/register">
              Crear cuenta
            </NavLink>
          </>
        )}

        {user && (
          <>
            <NavLink className="nav-link" to="/dashboard">
              Dashboard
            </NavLink>
            <div className="header-user-meta" aria-label="Informacion de usuario">
              <span className="user-inline-pill">
                <i className="bi bi-person-circle" aria-hidden="true" />
                {profile?.email || user?.email || 'Sin email'}
              </span>
              <span className="user-inline-pill">
                <i className={`bi ${profile?.has_sms ? 'bi-bell-fill' : 'bi-bell-slash'}`} aria-hidden="true" />
                SMS {profile?.has_sms ? 'Activado' : 'Desactivado'}
              </span>
            </div>
            <button
              className="icon-button"
              type="button"
              onClick={handleLogout}
              disabled={loading}
            >
              <i className="bi bi-box-arrow-right" aria-hidden="true" />
              Cerrar sesion
            </button>
          </>
        )}
      </nav>
    </header>
  )
}

export default Header