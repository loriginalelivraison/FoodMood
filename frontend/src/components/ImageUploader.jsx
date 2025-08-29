// src/components/ImageUploader.jsx
import { useState } from 'react'
import api from '../utils/client.js'
import { useAuth } from '../auth/useAuth.jsx'

export default function ImageUploader({ onUploaded, label = 'Téléverser une image' }) {
  const { token } = useAuth()
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  async function onPick(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setMsg('')
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('image', file) // champ "image" attendu par l’API
      const res = await api.upload('/api/upload/image', fd, token)
      // res = { url: 'https://res.cloudinary.com/.../image/upload/...' }
      onUploaded?.(res.url)
    } catch (err) {
      setMsg(err.message || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <label className="label">{label}</label>
      <input type="file" accept="image/*" onChange={onPick} disabled={loading} />
      {loading && <div className="text-xs text-zinc-500">Envoi…</div>}
      {msg && <div className="text-xs text-red-600">{msg}</div>}
    </div>
  )
}
