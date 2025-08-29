const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080"

async function request(path, opts = {}) {
  const res = await fetch(`${API_URL}${path}`, opts)
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    /* HTML error pages -> throw below */
  }
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

  // ✅ Upload avec FormData → bypass `request` pour ne pas forcer Content-Type
  upload: async (path, formData, token) => {
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        // ne surtout pas fixer Content-Type → fetch le gère automatiquement
      },
      body: formData,
      credentials: "include",
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      const msg = json?.error || json?.message || `HTTP ${res.status}`
      throw new Error(msg)
    }
    return json
  },
}

export default api
