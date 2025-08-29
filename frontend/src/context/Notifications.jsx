// frontend/src/context/Notifications.jsx
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from '../auth/useAuth.jsx'
import { useToast } from '../components/Toast.jsx' // si tu n'as pas, remplace toast.push(...) par alert(...)

const Ctx = createContext(null)

export function NotificationsProvider({ children }) {
  const { user } = useAuth()
  const toast = (() => {
    try { return useToast?.() } catch { return null }
  })()

  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)
  const socketRef = useRef(null)

  useEffect(() => {
    if (!user) return
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:8080', { transports: ['websocket'] })
    socketRef.current = socket

    socket.emit('join', `user:${user.id}`)

    socket.on('notify', (payload) => {
      const n = normalizeNotification(payload)
      setItems(prev => [n, ...prev].slice(0, 200))
      setUnread(u => u + 1)

      if (toast?.push) {
        toast.push({
          title: n.title ?? 'Notification',
          description: buildToastDescription(n),
          variant: 'info'
        })
      } else {
        // fallback
        console.log('[NOTIF]', n.title, buildToastDescription(n))
      }
    })

    return () => socket.disconnect()
  }, [user])

  function markAllRead() {
    setUnread(0)
    setItems(prev => prev.map(n => ({ ...n, read: true })))
  }

  const value = useMemo(() => ({
    items,
    unreadCount: unread,
    markAllRead,
  }), [items, unread])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useNotifications() {
  return useContext(Ctx)
}

function normalizeNotification(p) {
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    title: p?.title ?? 'Notification',
    body: p?.body ?? '',
    orderId: p?.orderId ?? null,
    status: p?.status ?? null,
    createdAt: p?.createdAt ? Number(p.createdAt) : Date.now(),
    read: false,
  }
}
function buildToastDescription(n) {
  const parts = []
  if (n.orderId) parts.push(`Commande #${n.orderId}`)
  if (n.status) parts.push(`Statut: ${n.status}`)
  if (n.body) parts.push(n.body)
  return parts.join(' • ')
}
