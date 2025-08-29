// src/pages/orders/OrderDetail.jsx
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../utils/client.js'
import { useAuth } from '../../auth/useAuth.jsx'
import OrderStepBar from '../../components/OrderStepBar.jsx'
import LiveMap from '../../components/LiveMap.jsx'
import { io } from 'socket.io-client'

export default function OrderDetail() {
  const { id } = useParams()
  const { token, user } = useAuth()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [couriersLive, setCouriersLive] = useState([]) // tous les livreurs en live

  // Chargement initial
  useEffect(() => {
    let mounted = true
    setLoading(true)
    setErr('')
    api.get(`/api/orders/${id}`, token)
      .then((data) => { if (mounted) setOrder(data) })
      .catch((e) => setErr(e?.message || 'Erreur de chargement'))
      .finally(() => mounted && setLoading(false))
    return () => { mounted = false }
  }, [id, token])

  // Live updates (statut + position du livreur assigné + positions de tous les livreurs)
  useEffect(() => {
    if (!id) return
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:8080', { transports: ['websocket'] })
    socket.emit('join', `order:${id}`)

    socket.on('order:status', (payload) => {
      setOrder((prev) => (prev && prev.id === Number(id) ? { ...prev, status: payload.status } : prev))
    })
    socket.on('order:location', (payload) => {
      // payload: { lat, lng, updatedAt? }
      setOrder((prev) =>
        prev && prev.id === Number(id)
          ? { ...prev, courierPosition: { lat: payload.lat, lng: payload.lng, updatedAt: payload.updatedAt } }
          : prev
      )
    })
    // flux global des positions de tous les livreurs
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
  }, [id])

  async function confirmDelivered() {
    try {
      const up = await api.post(`/api/orders/${id}/confirm-delivered`, {}, token)
      setOrder(up)
    } catch (e) {
      console.error(e)
      alert("Impossible de confirmer la réception.")
    }
  }

  if (loading) return <div>Chargement…</div>
  if (err) return <div className="text-red-600">{err}</div>
  if (!order) return null

  const canConfirm =
    user?.role === 'ADMIN' || (user?.role === 'CUSTOMER' && order.status === 'DELIVERING')

  // Points pour la carte
  const restaurantPoint =
    order.restaurant?.lat != null && order.restaurant?.lng != null
      ? { lat: order.restaurant.lat, lng: order.restaurant.lng, label: order.restaurant?.name }
      : null

  const deliveryPoint =
    order.deliveryLat != null && order.deliveryLng != null
      ? { lat: order.deliveryLat, lng: order.deliveryLng, label: order.deliveryAddress }
      : null

  // le livreur assigné doit rester jaune
  const highlightedCourierId = order?.courierId ?? order?.courier?.id ?? null

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Commande #{order.id}</h1>
        <Link className="btn-secondary" to="/orders">Retour</Link>
      </header>

      <div className="card">
        <OrderStepBar status={order.status} />
      </div>

      <section className="card">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="font-semibold mb-2">Restaurant</div>
            <div className="text-sm">{order.restaurant?.name}</div>
            {order.restaurant?.imageUrl && (
              <img
                src={order.restaurant.imageUrl}
                className="mt-2 h-20 w-20 rounded object-cover"
                alt=""
              />
            )}
          </div>

          <div>
            <div className="font-semibold mb-2">Livraison</div>
            <div className="text-sm">{order.deliveryAddress}</div>
            <div className="text-sm mt-1">Total : {(order.totalCents / 100).toFixed(2)} €</div>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="font-semibold mb-2">Détail</div>
        <ul className="text-sm list-disc pl-5">
          {(order.items || []).map((it) => (
            <li key={it.id}>
              {it.quantity} × {it.menuItem?.name ?? 'Plat'}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex gap-3">
        {canConfirm && (
          <button className="btn" onClick={confirmDelivered}>
            Confirmer la réception
          </button>
        )}
      </section>

      {/* ----- Carte avec légende (restaurant orange, client bleu, livreur assigné jaune, autres livreurs verts) ----- */}
      <section className="card">
        <div className="font-semibold mb-3">Suivi sur carte</div>
        <LiveMap
          restaurant={restaurantPoint}
          delivery={deliveryPoint}
          courier={null}
          couriers={couriersLive}
          highlightedCourierId={highlightedCourierId}
          height="260px"
          showLegend
        />
      </section>
    </div>
  )
}
