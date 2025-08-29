const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080"


async function request(path, opts = {}) {
  const res = await fetch(`${API_URL}${path}`, opts)
  const text = await res.text()
  let json = null
  try { json = text ? JSON.parse(text) : null } catch { /* HTML error pages -> throw below */ }
  if (!res.ok) {
    const msg = json?.error || json?.message || `HTTP ${res.status}`
    throw new Error(msg)
  }
  return json
}

const api = {
  get: (path, token) =>
    request(path, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      credentials: "include",
    }),

  post: (path, body, token) =>
    request(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body ?? {}),
      credentials: "include",
    }),

  put: (path, body, token) =>
    request(path, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body ?? {}),
      credentials: "include",
    }),

  patch: (path, body, token) =>
    request(path, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body ?? {}),
      credentials: "include",
    }),

  delete: (path, token) =>
    request(path, {
      method: "DELETE",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      credentials: "include",
    }),

  // ✅ upload multipart (ne pas fixer Content-Type manuellement)
  upload: (path, formData, token) =>
    request(path, {
      method: "POST",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData,
      credentials: "include",
    }),
}

export default api
