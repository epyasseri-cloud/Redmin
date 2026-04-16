/**
 * Technical overview:
 * - Layer: page
 * - Responsibility: render login flow container
 * - Composition: wraps login form component
 */

import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import LoginForm from '../components/auth/LoginForm.jsx'
import { useAuth } from '../hooks/useAuth.jsx'

function Login() {
  const navigate = useNavigate()
  const { loading, login, loginWithGoogle } = useAuth()
  const [error, setError] = useState('')

  async function handleLogin({ email, password }) {
    setError('')

    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (requestError) {
      setError(requestError.message || 'No fue posible iniciar sesion.')
    }
  }

  async function handleGoogleLogin() {
    setError('')

    try {
      await loginWithGoogle()
    } catch (requestError) {
      setError(requestError.message || 'No fue posible iniciar con Google.')
    }
  }

  return (
    <main className="app-container auth-layout">
      <section className="auth-card">
        <h1>Iniciar sesion</h1>
        <p>Accede con email y contrasena o usa Google como proveedor externo.</p>
        <LoginForm
          error={error}
          isLoading={loading}
          onSubmit={handleLogin}
          onGoogleLogin={handleGoogleLogin}
        />
        <p className="form-helper">
          No tienes cuenta? <Link to="/register">Registrate aqui</Link>
        </p>
      </section>
    </main>
  )
}

export default Login
