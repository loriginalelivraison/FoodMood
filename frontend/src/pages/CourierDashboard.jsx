// src/pages/CourierDashboard.jsx
import { useEffect, useState } from 'react'
import api from "../utils/client.js"
import { useAuth } from '../auth/useAuth.jsx'
import LiveMap from '../components/LiveMap.jsx'
import { io } from 'socket.io-client'

function courierNextLabel(status) {
  if (status === 'PREPARING') return 'Récupérer'
  if (status === 'PICKED_UP') return 'En route'
  return null
}
function courierNextStatus(status) {
  if (status === 'PREPARING') return 'PICKED_UP'
  if (status === 'PICKED_UP') return 'DELIVERING'
  return null
}

export default function CourierDashboard() {
  const { token, user } = useAuth()
  const [available, setAvailable] = useState([])
  const [mine, setMine] = useState([])
  const [msg, setMsg] = useState('')
  const [myPos, setMyPos] = useState(null)          // {lat, lng}
  const [couriersLive, setCouriersLive] = useState([])

  async function load() {
    try {
      const a = await api.get('/api/couriers/available-orders', token)
      const m = await api.get('/api/couriers/my-orders', token)
      setAvailable(a)
      setMine(m)
    } catch (e) {
      console.error(e)
      setMsg('Chargement échoué')
    }
  }
  useEffect(()=>{ load() }, [])

  // Socket pour positions live (utile pour montrer les autres livreurs en vert)
  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:8080', { transports: ['websocket'] })
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

  // Partage de la position (une fois autorisée, on l'envoie périodiquement)
  useEffect(() => {
    let watchId = null
    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude
          setMyPos({ lat, lng })
          // on push au backend (il émettra courier:position)
          api.post('/api/couriers/position', { lat, lng }, token).catch(()=>{})
        },
        (err) => { console.warn('Geoloc refusée/indisponible', err?.message) },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      )
    }
    return () => { if (watchId != null) navigator.geolocation.clearWatch(watchId) }
  }, [token])

  async function claim(orderId) {
    try {
      await api.post(`/api/couriers/claim/${orderId}`, {}, token)
      await load()
    } catch (e) {
      console.error(e)
      setMsg('Claim échoué')
    }
  }

  async function step(orderId, status) {
    const next = courierNextStatus(status)
    if (!next) return
    try {
      const up = await api.patch(`/api/orders/${orderId}/status/courier`, { status: next }, token)
      setMine(prev => prev.map(o => o.id === up.id ? up : o))
    } catch (e) {
      console.error(e)
      setMsg('Transition échouée')
    }
  }

  const openGmaps = (lat, lng, label) => {
    if (lat == null || lng == null) return
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(lat+','+lng)}&destination_place_id=&travelmode=driving`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Espace livreur</h1>
      {msg && <div className="p-3 bg-red-50 text-red-700 rounded">{msg}</div>}

      <section>
        <h2 className="text-lg font-semibold mb-3">À récupérer</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {available.map(o => {
            const restaurantPoint =
              (o.restaurant?.lat != null && o.restaurant?.lng != null)
                ? { lat: o.restaurant.lat, lng: o.restaurant.lng, label: o.restaurant?.name }
                : null
            const deliveryPoint =
              (o.deliveryLat != null && o.deliveryLng != null)
                ? { lat: o.deliveryLat, lng: o.deliveryLng, label: o.deliveryAddress }
                : null

            return (
              <div key={o.id} className="card">
                <div className="flex justify-between mb-2">
                  <div className="font-semibold">Commande #{o.id}</div>
                  <div className="text-sm">{o.restaurant?.name}</div>
                </div>
                <div className="text-sm mb-2">Status : <span className="font-medium">{o.status}</span></div>

                <LiveMap
                  restaurant={restaurantPoint}
                  delivery={deliveryPoint}
                  courier={myPos}
                  couriers={couriersLive}
                  highlightedCourierId={null} // pas d’assignation encore
                  height="220px"
                />

                <div className="mt-3 flex gap-2">
                  <button className="btn" onClick={()=>claim(o.id)}>Prendre la course</button>
                  {restaurantPoint && (
                    <button className="btn-secondary" onClick={()=>openGmaps(restaurantPoint.lat, restaurantPoint.lng, o.restaurant?.name)}>
                      Vers le restaurant
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Mes livraisons</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {mine.map(o => {
            const restaurantPoint =
              (o.restaurant?.lat != null && o.restaurant?.lng != null)
                ? { lat: o.restaurant.lat, lng: o.restaurant.lng, label: o.restaurant?.name }
                : null
            const deliveryPoint =
              (o.deliveryLat != null && o.deliveryLng != null)
                ? { lat: o.deliveryLat, lng: o.deliveryLng, label: o.deliveryAddress }
                : null

            return (
              <div key={o.id} className="card">
                <div className="flex justify-between mb-2">
                  <div className="font-semibold">Commande #{o.id}</div>
                  <div className="text-sm">{o.restaurant?.name}</div>
                </div>
                <div className="text-sm mb-2">Status : <span className="font-medium">{o.status}</span></div>

                <LiveMap
                  restaurant={restaurantPoint}
                  delivery={deliveryPoint}
                  courier={myPos}
                  couriers={couriersLive}
                  highlightedCourierId={user?.id || null} // moi = livreur assigné → jaune
                  height="220px"
                />

                <div className="mt-3 flex gap-2">
                  {restaurantPoint && (
                    <button className="btn-secondary" onClick={()=>openGmaps(restaurantPoint.lat, restaurantPoint.lng, o.restaurant?.name)}>
                      Vers le restaurant
                    </button>
                  )}
                  {deliveryPoint && (
                    <button className="btn-secondary" onClick={()=>openGmaps(deliveryPoint.lat, deliveryPoint.lng, o.deliveryAddress)}>
                      Vers le client
                    </button>
                  )}
                  {courierNextLabel(o.status) ? (
                    <button className="btn" onClick={()=>step(o.id, o.status)}>{courierNextLabel(o.status)}</button>
                  ) : (
                    <div className="text-xs text-zinc-500">En cours…</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
