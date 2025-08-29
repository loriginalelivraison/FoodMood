// src/components/Toast.jsx
import { createContext, useContext, useEffect, useState } from 'react'

const ToastCtx = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  function showToast({ type = 'info', message = '', duration = 2500 } = {}) {
    const id = Math.random().toString(36).slice(2)
    setToasts(t => [...t, { id, type, message }])
    setTimeout(() => {
      setToasts(t => t.filter(x => x.id !== id))
    }, duration)
  }

  return (
    <ToastCtx.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map(t => (
          <div
            key={t.id}
            className={[
              'rounded-xl px-4 py-3 shadow-lg text-sm text-white',
              t.type === 'success' ? 'bg-green-600' :
              t.type === 'error'   ? 'bg-red-600'   :
              t.type === 'warn'    ? 'bg-yellow-600': 'bg-zinc-800'
            ].join(' ')}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  return useContext(ToastCtx)
}
