import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import api from '../utils/client.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('token') || '')
  const [loading, setLoading] = useState(true)

  async function boot() {
    setLoading(true)
    try {
      if (token) {
        const me = await api.get('/api/auth/me', token)
        setUser(me)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
      setToken('')
      localStorage.removeItem('token')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { boot() }, [token])

  function saveAuth({ token: t, user: u }) {
    setToken(t)
    localStorage.setItem('token', t)
    setUser(u)
  }

  async function login(phone, password) {
    const data = await api.post('/api/auth/login', { phone, password })
    saveAuth(data)
    return data.user
  }

  async function register(payload) {
    // payload: { phone, password, name?, role }
    const data = await api.post('/api/auth/register', payload)
    saveAuth(data)
    return data.user
  }

  function logout() {
    setUser(null)
    setToken('')
    localStorage.removeItem('token')
  }

  const value = useMemo(() => ({ user, token, loading, login, register, logout }), [user, token, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
