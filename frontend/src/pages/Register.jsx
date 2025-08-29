import { useEffect, useMemo, useState } from 'react'
import api from '../utils/client.js'
import RestaurantCard from '../components/RestaurantCard.jsx'

export default function Restaurants() {
  const [all, setAll] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    let mounted = true
    setLoading(true)
    api.get('/api/restaurants')
      .then((data) => {
        if (mounted) { setAll(data); setMsg('') }
      })
      .catch((e) => setMsg(e?.message || 'Erreur de chargement'))
      .finally(() => mounted && setLoading(false))
    return () => { mounted = false }
  }, [])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return all
    return all.filter(r =>
      r.name?.toLowerCase().includes(s) ||
      r.description?.toLowerCase().includes(s) ||
      r.address?.toLowerCase().includes(s)
    )
  }, [q, all])

  return (
    <div className="container py-6 space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-50 to-rose-50 p-6 md:p-10">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
             <span className="text-[var(--brand,#f97316)]">trouve tonrestaurant ici </span>
          </h1>
          <p className="mt-2 text-zinc-600">
            Parcourez les meilleures adresses près de chez vous et commandez en quelques clics.
          </p>
        </div>
        {/* Search */}
        <div className="mt-6 max-w-xl">
          <div className="flex items-center rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" className="mx-2 opacity-60"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 5L20.5 19zM9.5 14C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14"/></svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="input !border-0 !shadow-none focus:ring-0"
              placeholder="Rechercher un restaurant ou une cuisine…"
            />
          </div>
        </div>
      </section>

      {loading && <div className="text-zinc-600">Chargement…</div>}
      {msg && <div className="rounded-xl bg-red-50 p-3 text-red-700">{msg}</div>}

      {/* Grid */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {filtered.length} restaurant{filtered.length > 1 ? 's' : ''}
          </h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((r) => (
            <RestaurantCard key={r.id} r={r} />
          ))}
        </div>
      </section>
    </div>
  )
}
