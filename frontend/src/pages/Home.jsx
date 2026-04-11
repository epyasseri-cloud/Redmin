import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'

function Home() {
  const { user } = useAuth()

  return (
    <main className="app-container">
      <section className="hero">
        <div>
          <h1>DocRemind centraliza el acceso a tus documentos</h1>
          <p>
            Esta primera iteracion deja lista la autenticacion con Supabase para
            registro, login, logout y proteccion de rutas.
          </p>
        </div>

        <div className="hero-actions">
          <Link className="button button-primary" to={user ? '/dashboard' : '/register'}>
            {user ? 'Ir al dashboard' : 'Crear cuenta'}
          </Link>
          {!user ? (
            <Link className="button button-secondary" to="/login">
              Iniciar sesion
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  )
}

export default Home