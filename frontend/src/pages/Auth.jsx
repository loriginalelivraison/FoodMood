import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.jsx'

export default function Auth({ initialTab = 'login' }) {
  const { login, register } = useAuth()
  const [tab, setTab] = useState(initialTab) // 'login' | 'register'
  const [msg, setMsg] = useState('')
  const nav = useNavigate()
  const loc = useLocation()

  // login form
  const [lPhone, setLPhone] = useState('')
  const [lPass, setLPass] = useState('')
  const [loading, setLoading] = useState(false)

  // register form
  const [rPhone, setRPhone] = useState('')
  const [rPass, setRPass] = useState('')
  const [rName, setRName] = useState('')
  const [rRole, setRRole] = useState('CUSTOMER') // <= IMPORTANT

  useEffect(() => setTab(initialTab), [initialTab])

  async function doLogin(e) {
    e.preventDefault()
    setMsg('')
    setLoading(true)
    try {
      const user = await login(lPhone.trim(), lPass)
      // Redirige vers l’espace selon le rôle (optionnel) ou vers “next”
      const next = new URLSearchParams(loc.search).get('next')
      if (next) return nav(next, { replace: true })
      if (user.role === 'OWNER') return nav('/owner', { replace: true })
      if (user.role === 'COURIER') return nav('/courier', { replace: true })
      return nav('/', { replace: true })
    } catch (e) {
      setMsg(e.message || 'Échec de connexion')
    } finally {
      setLoading(false)
    }
  }

  async function doRegister(e) {
    e.preventDefault()
    setMsg('')
    setLoading(true)
    try {
      const user = await register({
        phone: rPhone.trim(),
        password: rPass,
        name: rName.trim() || undefined,
        role: rRole, // <= IMPORTANT: on envoie le rôle choisi
      })
      const next = new URLSearchParams(loc.search).get('next')
      if (next) return nav(next, { replace: true })
      if (user.role === 'OWNER') return nav('/owner', { replace: true })
      if (user.role === 'COURIER') return nav('/courier', { replace: true })
      if (user.role === 'ADMIN') return nav('/admin', { replace: true })

      return nav('/', { replace: true })
    } catch (e) {
      setMsg(e.message || 'Échec inscription')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto mt-8 space-y-6">
      <div className="rounded-2xl border p-1 flex">
        <button className={`flex-1 py-2 rounded-xl ${tab==='login' ? 'bg-orange-500 text-white' : ''}`} onClick={()=>setTab('login')}>Se connecter</button>
        <button className={`flex-1 py-2 rounded-xl ${tab==='register' ? 'bg-orange-500 text-white' : ''}`} onClick={()=>setTab('register')}>Créer un compte</button>
      </div>

      {msg && <div className="p-3 rounded bg-red-50 text-red-700">{msg}</div>}

      {tab === 'login' ? (
        <form onSubmit={doLogin} className="card space-y-3">
          <div>
            <label className="label">Téléphone</label>
            <input className="input" value={lPhone} onChange={e=>setLPhone(e.target.value)} required />
          </div>
          <div>
            <label className="label">Mot de passe</label>
            <input type="password" className="input" value={lPass} onChange={e=>setLPass(e.target.value)} required />
          </div>
          <button className="btn" disabled={loading}>{loading ? '...' : 'Se connecter'}</button>
        </form>
      ) : (
        <form onSubmit={doRegister} className="card space-y-3">
          <div>
            <label className="label">Téléphone</label>
            <input className="input" value={rPhone} onChange={e=>setRPhone(e.target.value)} required />
          </div>
          <div>
            <label className="label">Mot de passe</label>
            <input type="password" className="input" value={rPass} onChange={e=>setRPass(e.target.value)} required />
          </div>
          <div>
            <label className="label">Nom (optionnel)</label>
            <input className="input" value={rName} onChange={e=>setRName(e.target.value)} />
          </div>
          <div>
            <label className="label">Rôle</label>
            <select className="input" value={rRole} onChange={e=>setRRole(e.target.value)}>
              <option value="CUSTOMER">Client</option>
              <option value="OWNER">Restaurateur</option>
              <option value="COURIER">Livreur</option>
              <option value="ADMIN">Admin</option> {/* ✅ AJOUT */}
            </select>
          </div>
          <button className="btn" disabled={loading}>{loading ? '...' : "S'inscrire"}</button>
        </form>
      )}
    </div>
  )
}
