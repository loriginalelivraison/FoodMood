// src/pages/Checkout.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../store/cart.jsx'
import { useAuth } from '../auth/useAuth.jsx'
import api from '../utils/client.js'
import MapPicker from '../components/MapPicker.jsx'

export default function Checkout() {
  const cartCtx = useCart()
  const { user, token } = useAuth()
  const navigate = useNavigate()

  // Sécurité si le contexte n’est pas dispo
  if (!cartCtx) {
    return <div className="container py-6 text-red-600">Contexte panier indisponible.</div>
  }

  const { cart, items, restaurantId, totalCents, setQuantity, removeItem, clear } = {
    items: cartCtx.cart?.items || [],
    restaurantId: cartCtx.cart?.restaurantId || null,
    totalCents: cartCtx.totalCents || 0,
    setQuantity: cartCtx.setQuantity,
    removeItem: cartCtx.removeItem,
    clear: cartCtx.clearCart,
    cart: cartCtx.cart,
  }

  const [addr, setAddr] = useState('')
  const [point, setPoint] = useState(null) // {lat,lng,address?}
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { setMsg('') }, [items.length])

  async function useMyLocation() {
    setMsg('')
    if (!navigator.geolocation) {
      setMsg("La géolocalisation n'est pas supportée par votre navigateur.")
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        // reverse geocode basique
        try {
          const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
          const data = await resp.json()
          const address = data?.display_name || addr
          setAddr(address)
          setPoint({ lat, lng, address })
        } catch {
          setPoint({ lat, lng })
        }
      },
      (err) => {
        console.error(err)
        setMsg("Impossible d'obtenir votre position. Autorisez la localisation.")
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  async function placeOrder() {
    setMsg('')

    if (!user) {
      navigate('/auth?next=/checkout')
      return
    }
    if (user.role !== 'CUSTOMER') {
      setMsg("Seuls les clients peuvent passer commande.")
      return
    }
    if (!items.length || !restaurantId) {
      setMsg("Votre panier est vide.")
      return
    }
    if (!addr.trim()) {
      setMsg("Veuillez saisir une adresse de livraison.")
      return
    }

    setLoading(true)
    try {
      const payload = {
        restaurantId,
        deliveryAddress: addr.trim(),
        items: items.map(it => ({ menuItemId: it.menuItemId, quantity: it.quantity })),
        // on envoie les coords si on les a
        deliveryLat: point?.lat,
        deliveryLng: point?.lng,
      }
      await api.post('/api/orders', payload, token)
      clear()
      navigate('/orders')
    } catch (e) {
      console.error(e)
      setMsg("Échec de la commande.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Panier</h1>

      {msg && <div className="p-3 bg-red-50 text-red-700 rounded">{msg}</div>}

      {!items.length ? (
        <div className="text-zinc-600">Votre panier est vide.</div>
      ) : (
        <>
          <div className="grid gap-3">
            {items.map(it => (
              <div key={it.menuItemId} className="border rounded-2xl p-3 flex items-center gap-3">
                {it.imageUrl && <img src={it.imageUrl} className="h-14 w-14 rounded object-cover" alt="" />}
                <div className="flex-1">
                  <div className="font-semibold">{it.name}</div>
                  <div className="text-xs text-zinc-500">{(it.priceCents/100).toFixed(2)} €</div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="btn" onClick={()=>setQuantity(it.menuItemId, Math.max(1, it.quantity-1))}>-</button>
                  <div className="w-8 text-center">{it.quantity}</div>
                  <button className="btn" onClick={()=>setQuantity(it.menuItemId, it.quantity+1)}>+</button>
                  <button className="btn-secondary" onClick={()=>removeItem(it.menuItemId)}>Retirer</button>
                </div>
              </div>
            ))}
          </div>

          <div className="card space-y-3">
            <div className="flex justify-between">
              <span>Sous-total</span>
              <span>{((totalCents - (items.length ? 299 : 0))/100).toFixed(2)} €</span>
            </div>
            <div className="flex justify-between">
              <span>Livraison</span>
              <span>{items.length ? '2,99 €' : '0,00 €'}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{(totalCents/100).toFixed(2)} €</span>
            </div>
          </div>

          {/* Adresse + carte */}
          <div className="card space-y-3">
            <label className="label">Adresse de livraison</label>
            <input
              className="input"
              value={addr}
              onChange={e => setAddr(e.target.value)}
              placeholder="Ex: 12 rue de Paris, 75000 Paris"
            />

            <div className="flex flex-wrap gap-2">
              <button className="btn" type="button" onClick={useMyLocation}>📍 Ma position</button>
              <span className="text-xs text-zinc-500">
                Ou cliquez sur la carte pour placer le marqueur
              </span>
            </div>

            <MapPicker
              value={point}
              onChange={(p) => {
                setPoint(p)
                if (p?.address) setAddr(p.address)
              }}
              defaultCenter={{ lat: 48.8566, lng: 2.3522 }}
              height="320px"
            />

            {point?.lat && point?.lng && (
              <div className="text-xs text-zinc-500">
                lat: {point.lat.toFixed(5)} / lng: {point.lng.toFixed(5)}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button className="btn" onClick={placeOrder} disabled={loading}>
              {loading ? '...' : 'Confirmer la commande'}
            </button>
            <button className="btn-secondary" onClick={clear}>Vider le panier</button>
          </div>
        </>
      )}
    </div>
  )
}
