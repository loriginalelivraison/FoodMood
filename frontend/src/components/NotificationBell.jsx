// frontend/src/components/NotificationBell.jsx
import { useEffect, useRef, useState } from "react"
import { useNotifications } from "../context/Notifications.jsx"
import { Link } from "react-router-dom"

export default function NotificationBell() {
  const ctx = useNotifications()
  if (!ctx) return null
  const { items, unreadCount, markAllRead } = ctx

  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function onClickOutside(e) {
      if (open && ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener("click", onClickOutside)
    return () => document.removeEventListener("click", onClickOutside)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/60 bg-white/90 hover:bg-white"
        onClick={() => setOpen(o => !o)}
        aria-label="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="currentColor" d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2m6-6v-5a6 6 0 1 0-12 0v5l-2 2v1h16v-1l-2-2z"/>
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 overflow-hidden rounded-2xl border bg-white shadow-lg">
          <div className="flex items-center justify-between px-3 py-2">
            <div className="text-sm font-semibold">Notifications</div>
            {items.length > 0 && (
              <button className="text-xs text-zinc-600 hover:underline" onClick={markAllRead}>
                Tout marquer comme lu
              </button>
            )}
          </div>
          <div className="h-px bg-zinc-100" />
          <div className="max-h-96 overflow-auto">
            {items.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-zinc-500">
                Aucune notification
              </div>
            ) : (
              items.map(n => (
                <div key={n.id} className="px-3 py-2 text-sm hover:bg-zinc-50">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{n.title}</div>
                    <div className="text-[11px] text-zinc-500">
                      {new Date(n.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="text-zinc-600">
                    {n.orderId && <span className="mr-2"># {n.orderId}</span>}
                    {n.status && (
                      <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-700">
                        {n.status}
                      </span>
                    )}
                  </div>
                  {n.body && <div className="text-zinc-600">{n.body}</div>}
                  {n.orderId && (
                    <div className="mt-1">
                      <Link className="text-xs text-[var(--brand,#f97316)] hover:underline" to={`/orders/${n.orderId}`}>
                        Voir la commande
                      </Link>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
