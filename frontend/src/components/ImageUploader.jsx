import { useRef, useState } from "react"
import { useAuth } from "../auth/useAuth.jsx"
import api from "../utils/client.js"

export default function ImageUploader({ onUploaded, label = "Téléverser une image" }) {
  const inputRef = useRef(null)
  const { token } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [fileName, setFileName] = useState("")

  async function onPick(e) {
    const file = e.target.files?.[0]
    setError("")
    if (!file) return
    setFileName(file.name)

    // simple garde-fou
    if (!/^image\/(png|jpe?g|webp|gif|svg\+xml)$/.test(file.type)) {
      setError("Format non supporté (png, jpg, webp, gif, svg)")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Taille max 5 Mo")
      return
    }

    const fd = new FormData()
    // ⚠️ la clé DOIT s'appeler "image" pour matcher upload.single('image')
    fd.append("image", file, file.name)

    try {
      setBusy(true)
      const res = await api.upload("/api/upload/image", fd, token)
      if (res?.url) onUploaded?.(res.url)
      else setError("Upload échoué")
    } catch (e) {
      setError(e?.message || "Upload échoué")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="text-sm mb-1">{label}</div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onPick}
        className="block w-full text-sm file:mr-3 file:rounded-lg file:border file:px-3 file:py-2 file:bg-white hover:file:bg-zinc-50"
      />
      {fileName && <div className="mt-1 text-xs text-zinc-500">{fileName}</div>}
      {busy && <div className="mt-1 text-xs text-zinc-500">Envoi…</div>}
      {error && <div className="mt-1 text-xs text-red-600">{error}</div>}
    </div>
  )
}
