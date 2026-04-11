import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'

function Home() {
  const { user } = useAuth()

  return (
    <main className="app-container">
      <section className="hero">
        <span className="hero-chip">
          <i className="bi bi-stars" aria-hidden="true" />
          Nuevo sistema inteligente de recordatorios
        </span>

        <div className="hero-copy">
          <h1>Intelligent Automation for Modern Documents.</h1>
          <p>
            Automatiza OCR, extraccion de fechas y alertas por email o SMS para que
            ningun documento vuelva a vencer sin aviso.
          </p>
        </div>

        <div className="hero-actions">
          <Link className="button button-primary" to={user ? '/dashboard' : '/register'}>
            <i className="bi bi-arrow-up-right" aria-hidden="true" />
            {user ? 'Ir al dashboard' : 'Crear cuenta'}
          </Link>
          {!user ? (
            <Link className="button button-secondary" to="/login">
              <i className="bi bi-box-arrow-in-right" aria-hidden="true" />
              Iniciar sesion
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  )
}

export default Home