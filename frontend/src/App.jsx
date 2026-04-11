import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import './App.css'
import Header from './components/common/Header.jsx'
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'

function ProtectedRoute() {
  const { loading, user } = useAuth()

  if (loading) {
    return <div className="page-state">Cargando sesion...</div>
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />
}

function GuestRoute() {
  const { loading, user } = useAuth()

  if (loading) {
    return <div className="page-state">Cargando sesion...</div>
  }

  return user ? <Navigate to="/dashboard" replace /> : <Outlet />
}

function AppShell() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>
        </Routes>
      </div>
    </BrowserRouter>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}

export default App