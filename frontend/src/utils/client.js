// src/utils/client.js
const API_URL =
  import.meta.env.VITE_API_URL || window.location.origin || 'http://localhost:8080'

async function request(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  })

  const txt = await res.text()
  const data = txt ? JSON.parse(txt) : null
  if (!res.ok) {
    throw new Error(typeof data?.error === 'string' ? data.error : `HTTP ${res.status}`)
  }
  return data
}

// ➕ upload multipart/form-data
async function upload(path, formData, token) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}` // laisse le navigateur définir Content-Type

  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
    credentials: 'include',
  })

  const txt = await res.text()
  const data = txt ? JSON.parse(txt) : null
  if (!res.ok) {
    throw new Error(typeof data?.error === 'string' ? data.error : `HTTP ${res.status}`)
  }
  return data
}

const api = {
  get: (path, token) => request('GET', path, null, token),
  post: (path, body, token) => request('POST', path, body, token),
  put: (path, body, token) => request('PUT', path, body, token),
  patch: (path, body, token) => request('PATCH', path, body, token),
  delete: (path, token) => request('DELETE', path, null, token),
  upload,
}

export default api
