function LoginForm({ error, isLoading, onSubmit, onGoogleLogin }) {
  async function handleSubmit(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const email = formData.get('email')?.toString().trim() ?? ''
    const password = formData.get('password')?.toString() ?? ''
    await onSubmit({ email, password })
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {error ? <div className="alert alert-error">{error}</div> : null}

      <label htmlFor="login-email">
        Correo electronico
        <input id="login-email" name="email" type="email" required />
      </label>

      <label htmlFor="login-password">
        Contrasena
        <input id="login-password" name="password" type="password" required />
      </label>

      <div className="button-row">
        <button className="button button-primary button-block" type="submit" disabled={isLoading}>
          <i className="bi bi-box-arrow-in-right" aria-hidden="true" />
          {isLoading ? 'Ingresando...' : 'Entrar'}
        </button>
        <button
          className="button button-outline button-block"
          type="button"
          onClick={onGoogleLogin}
          disabled={isLoading}
        >
          <i className="bi bi-google" aria-hidden="true" />
          Continuar con Google
        </button>
      </div>
    </form>
  )
}

export default LoginForm