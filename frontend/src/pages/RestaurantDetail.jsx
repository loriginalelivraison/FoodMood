import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../utils/client.js'
import { useCart } from '../store/cart.jsx'
import MenuItemCard from '../components/MenuItemCard.jsx'


export default function RestaurantDetail() {
  const { id } = useParams()
  const cartCtx = useCart()
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    let mounted = true
    setLoading(true)
    api.get(`/api/restaurants/${id}`)
      .then((data) => {
        if (mounted) { setRestaurant(data); setErr('') }
      })
      .catch((e) => setErr(e?.message || 'Erreur de chargement'))
      .finally(() => mounted && setLoading(false))
    return () => { mounted = false }
  }, [id])

  if (!cartCtx) {
    return (
      <div className="container py-6">
        <div className="card bg-red-50 border border-red-200">
          <div className="font-semibold text-red-700">Contexte panier indisponible</div>
          <div className="text-sm text-red-600 mt-1">
            Vérifie que <code>CartProvider</code> enveloppe l’app (voir <code>src/main.jsx</code>).
          </div>
        </div>
      </div>
    )
  }

  const { addItem, cart, totalCents } = cartCtx
  const itemsCount = cart.items.reduce((n, it) => n + it.quantity, 0)

  if (loading) return <div className="container py-6">Chargement…</div>
  if (err) return <div className="container py-6 text-red-600">{err}</div>
  if (!restaurant) return null

  if (loading) {
  return (
    <div className="container py-6 space-y-4">
      <div className="h-48 rounded-3xl bg-zinc-100 animate-pulse" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => <MenuSkeleton key={i} />)}
      </div>
    </div>
  )
}

  return (
    <div className="container py-6 space-y-8">
      {/* HERO header */}
      <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white">
        <div className="relative aspect-[21/9] w-full overflow-hidden">
          {restaurant.imageUrl ? (
            <img src={restaurant.imageUrl} alt={restaurant.name} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-zinc-100" />
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 md:p-6">
            <h1 className="text-2xl font-extrabold text-white md:text-3xl">{restaurant.name}</h1>
            {restaurant.address && (
              <p className="mt-1 text-sm text-white/90">{restaurant.address}</p>
            )}
            <div className="mt-2 flex items-center gap-3 text-xs text-white/90">
              <span className="rounded-full bg-white/20 px-2 py-1">4.7 ★</span>
              <span className="rounded-full bg-white/20 px-2 py-1">Livraison 20-30 min</span>
              <span className="rounded-full bg-white/20 px-2 py-1">Frais 2,99 €</span>
            </div>
          </div>
        </div>
        {restaurant.description && (
          <div className="p-4 text-sm text-zinc-600 md:p-6">{restaurant.description}</div>
        )}
      </section>

      {/* MENU */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Menu</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(restaurant.menu || []).map((item) => (
            <MenuItemCard
              key={item.id}
              item={item}
              onAdd={() => addItem(restaurant.id, item, 1)}
            />
          ))}
        </div>
      </section>

      {/* STICKY CTA panier */}
      <div className="sticky bottom-4 z-20 flex justify-center">
        {itemsCount > 0 && (
          <Link
            to="/checkout"
            className="flex items-center gap-3 rounded-full bg-[var(--brand,#f97316)] px-5 py-3 text-white shadow-2xl transition hover:brightness-105"
          >
            <span className="h-2 w-2 rounded-full bg-white" />
            <span>{itemsCount} article{itemsCount > 1 ? 's' : ''}</span>
            <span className="opacity-90">•</span>
            <span className="font-semibold">{(totalCents / 100).toFixed(2)} €</span>
            <span className="ml-1 text-white/90 underline underline-offset-2">Voir le panier</span>
          </Link>
        )}
      </div>

      
    </div>
    
  )
}
