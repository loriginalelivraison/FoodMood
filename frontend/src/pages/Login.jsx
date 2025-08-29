import { useState } from 'react'
import api from '../utils/client.js'
import { useAuth } from '../auth/useAuth.jsx'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const { login } = useAuth()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function submit(e){
    e.preventDefault()
    setError('')
    try {
      const res = await api.post('/api/auth/login', { phone, password })
      login(res)
      navigate('/')
    } catch (e) { setError(e.message) }
  }

  return (
    <div className="max-w-md mx-auto card">
      <h1 className="text-xl font-semibold mb-4">Connexion</h1>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="label">Téléphone</label>
          <input className="input" value={phone} onChange={e=>setPhone(e.target.value)} />
        </div>
        <div>
          <label className="label">Mot de passe</label>
          <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        </div>
        {error && <div className="text-red-600">{error}</div>}
        <button className="btn">Se connecter</button>
      </form>
    </div>
  )
}
