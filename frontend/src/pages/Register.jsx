import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import RegisterForm from '../components/auth/RegisterForm.jsx'
import { useAuth } from '../hooks/useAuth.jsx'

function Register() {
  const navigate = useNavigate()
  const { loading, loginWithGoogle, register } = useAuth()
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  async function handleRegister({ email, password, confirmPassword }) {
    setError('')
    setSuccessMessage('')

    if (password !== confirmPassword) {
      setError('Las contrasenas no coinciden.')
      return
    }

    try {
      const data = await register(email, password)

      if (data.session) {
        navigate('/dashboard')
        return
      }

      setSuccessMessage(
        'Cuenta creada. Si tu proyecto Supabase requiere confirmacion por correo, revisa tu bandeja antes de iniciar sesion.',
      )
    } catch (requestError) {
      setError(requestError.message || 'No fue posible crear la cuenta.')
    }
  }

  async function handleGoogleLogin() {
    setError('')

    try {
      await loginWithGoogle()
    } catch (requestError) {
      setError(requestError.message || 'No fue posible registrarse con Google.')
    }
  }

  return (
    <main className="app-container auth-layout">
      <section className="auth-card">
        <h1>Crear cuenta</h1>
        <p>El perfil de usuario se sincronizara con Supabase despues del alta.</p>
        <RegisterForm
          error={error}
          isLoading={loading}
          onSubmit={handleRegister}
          onGoogleLogin={handleGoogleLogin}
          successMessage={successMessage}
        />
        <p className="form-helper">
          Ya tienes cuenta? <Link to="/login">Inicia sesion</Link>
        </p>
      </section>
    </main>
  )
}

export default Register