// src/pages/orders/RestaurantOrders.jsx
import { useEffect, useState } from 'react'
import api from '../../utils/client.js'
import { useAuth } from '../../auth/useAuth.jsx'
import { Link } from 'react-router-dom'
import { useToast } from '../../components/Toast.jsx'
import { io } from 'socket.io-client'
import LiveMap from '../../components/LiveMap.jsx'

function nextOwnerActionLabel(status) {
  if (status === 'PENDING') return 'Accepter'
  if (status === 'ACCEPTED') return 'Préparer'
  return null
}
function nextOwnerStatus(status) {
  if (status === 'PENDING') return 'ACCEPTED'
  if (status === 'ACCEPTED') return 'PREPARING'
  return null
}

export default function RestaurantOrders() {
  const { token } = useAuth()
  const { showToast } = useToast()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [couriersLive, setCouriersLive] = useState([]) // [{courierId, lat, lng, updatedAt}]

  async function load() {
    setLoading(true)
    setError('')
    try {
      const list = await api.get('/api/orders/my', token)
      setOrders(Array.isArray(list) ? list : [])
    } catch (e) {
      console.error(e)
      setError("Impossible de charger les commandes.")
      setOrders([])
      showToast({ type: 'error', message: 'Chargement des commandes échoué' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:8080', { transports: ['websocket'] })

    socket.on('order:claimed', (payload) => {
      setOrders(prev => prev.map(o =>
        o.id === payload.orderId ? { ...o, courier: payload.courier || { id: payload.courierId } } : o
      ))
    })

    socket.on('courier:position', (p) => {
      if (p?.courierId == null) return
      setCouriersLive(prev => {
        const idx = prev.findIndex(x => x.courierId === p.courierId)
        if (idx === -1) return [...prev, p]
        const copy = prev.slice()
        copy[idx] = { ...copy[idx], ...p }
        return copy
      })
    })

    return () => socket.disconnect()
  }, [])

  async function doOwnerTransition(orderId, currentStatus) {
    const next = nextOwnerStatus(currentStatus)
    if (!next) return

    const prev = orders
    const optimistic = prev.map(o => (o.id === orderId ? { ...o, status: next } : o))
    setOrders(optimistic)

    try {
      const updated = await api.patch(`/api/orders/${orderId}/status/owner`, { status: next }, token)
      if (updated && typeof updated === 'object' && updated.id) {
        setOrders(curr => curr.map(o => (o.id === updated.id ? updated : o)))
      }
      showToast({ type: 'success', message: `Statut → ${next}` })
    } catch (e) {
      console.error(e)
      setError("Transition refusée.")
      setOrders(prev)
      showToast({ type: 'error', message: 'Transition refusée' })
    }
  }

  if (loading) return <div>Chargement…</div>

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Commandes du restaurant</h1>
        <Link to="/" className="btn-secondary">Retour</Link>
      </header>

      {error && <div className="p-3 bg-red-50 text-red-700 rounded">{error}</div>}

      {(!Array.isArray(orders) || orders.length === 0) ? (
        <div className="text-zinc-600">Aucune commande pour le moment.</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {(orders || []).map(o => {
            const restaurantPoint =
              (o.restaurant?.lat != null && o.restaurant?.lng != null)
                ? { lat: o.restaurant.lat, lng: o.restaurant.lng, label: o.restaurant?.name }
                : null

            const deliveryPoint =
              (o.deliveryLat != null && o.deliveryLng != null)
                ? { lat: o.deliveryLat, lng: o.deliveryLng, label: o.deliveryAddress }
                : null

            const highlightedCourierId = o.courier?.id || o.courierId || null

            return (
              <div key={o.id} className="card">
                <div className="flex justify-between mb-2">
                  <div className="font-semibold">Commande #{o.id}</div>
                  <div className="text-sm">{o.restaurant?.name}</div>
                </div>

                <div className="text-sm mb-2">
                  Statut : <span className="font-medium">{o.status}</span>
                </div>

                {o.courier ? (
                  <div className="text-xs mb-2 p-2 rounded bg-yellow-50 border border-yellow-200">
                    <span className="font-medium">Livreur : </span>
                    {o.courier.name || `#${o.courier.id}`} — {o.courier.phone || 'tél. indisponible'}
                  </div>
                ) : (
                  <div className="text-xs text-zinc-500 mb-2">En attente d’un livreur…</div>
                )}

                <LiveMap
                  restaurant={restaurantPoint}
                  delivery={deliveryPoint}
                  courier={null}
                  couriers={couriersLive}
                  highlightedCourierId={highlightedCourierId}
                  height="220px"
                />

                <ul className="text-sm list-disc pl-5 my-3">
                  {(o.items || []).map(it => (
                    <li key={it.id}>{it.quantity} × {it.menuItem?.name ?? 'Plat'}</li>
                  ))}
                </ul>

                <div className="flex items-center justify-between">
                  <div className="font-semibold">{(o.totalCents/100).toFixed(2)} €</div>
                  {nextOwnerActionLabel(o.status) ? (
                    <button className="btn" onClick={() => doOwnerTransition(o.id, o.status)}>
                      {nextOwnerActionLabel(o.status)}
                    </button>
                  ) : (
                    <div className="text-xs text-zinc-500">En attente du livreur…</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
