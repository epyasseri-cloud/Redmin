/**
 * Technical overview:
 * - Layer: component
 * - Responsibility: collect registration input and trigger sign-up
 * - UX: validates and reports registration errors
 */

function RegisterForm({ error, isLoading, onSubmit, onGoogleLogin, successMessage }) {
  async function handleSubmit(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const email = formData.get('email')?.toString().trim() ?? ''
    const password = formData.get('password')?.toString() ?? ''
    const confirmPassword = formData.get('confirmPassword')?.toString() ?? ''
    await onSubmit({ email, password, confirmPassword })
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {error ? <div className="alert alert-error">{error}</div> : null}
      {successMessage ? <div className="alert alert-success">{successMessage}</div> : null}

      <label htmlFor="register-email">
        Correo electronico
        <input id="register-email" name="email" type="email" required />
      </label>

      <label htmlFor="register-password">
        Contrasena
        <input id="register-password" name="password" type="password" minLength="6" required />
      </label>

      <label htmlFor="register-confirm-password">
        Confirmar contrasena
        <input
          id="register-confirm-password"
          name="confirmPassword"
          type="password"
          minLength="6"
          required
        />
      </label>

      <div className="button-row">
        <button className="button button-primary button-block" type="submit" disabled={isLoading}>
          <i className="bi bi-person-plus" aria-hidden="true" />
          {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
        <button
          className="button button-outline button-block"
          type="button"
          onClick={onGoogleLogin}
          disabled={isLoading}
        >
          <i className="bi bi-google" aria-hidden="true" />
          Registrarse con Google
        </button>
      </div>
    </form>
  )
}

export default RegisterForm
