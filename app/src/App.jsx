import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import CDash from './components/CDash'
import Dashboard from './components/Dashboard'
import Login from './components/Login'
import Register from './components/Register'
import ForgotPassword from './components/ForgotPassword'
import './App.css'

function ProtectedRoute({ children }) {
  return localStorage.getItem('token') ? children : <Navigate to="/login" replace />
}
function Shell() {
  const location = useLocation()
  const [authVersion, setAuthVersion] = useState(0)
  useEffect(() => { setAuthVersion(v => v + 1) }, [location.pathname])
  return <div className="app-shell" data-auth-version={authVersion}><Navbar /><main className="page-main"><Routes>
    <Route path="/" element={<CDash />} />
    <Route path="/login" element={localStorage.getItem('token') ? <Navigate to="/dashboard" replace /> : <Login />} />
    <Route path="/register" element={localStorage.getItem('token') ? <Navigate to="/dashboard" replace /> : <Register />} />
    <Route path="/forgot-password" element={localStorage.getItem('token') ? <Navigate to="/dashboard" replace /> : <ForgotPassword />} />
    <Route path="/reg" element={<Navigate to="/register" replace />} />
    <Route path="/dash" element={<Navigate to="/dashboard" replace />} />
    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="*" element={<div className="empty-state"><span className="empty-icon">⌁</span><h2>Page not found</h2><p>The page you’re looking for doesn’t exist.</p><a className="btn btn-primary" href="/">Back to library</a></div>} />
  </Routes></main><footer className="site-footer"><p>© {new Date().getFullYear()} NotesHub — College Notes & Study Material Sharing Portal</p></footer></div>
}
export default function App() { return <BrowserRouter><Shell /></BrowserRouter> }
