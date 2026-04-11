import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'

function Header() {
  const navigate = useNavigate()
  const { loading, user, logout } = useAuth()

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