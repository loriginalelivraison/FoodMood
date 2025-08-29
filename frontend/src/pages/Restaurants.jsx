// src/pages/Restaurants.jsx
import { useEffect, useMemo, useState } from 'react'
import api from '../utils/client.js'
import RestaurantCard from '../components/RestaurantCard.jsx'
import RestaurantRow from '../components/RestaurantRow.jsx'

/* helpers */
const LABELS = {
  PIZZA: 'Pizza',
  BURGER: 'Burger',
  JAPONAIS: 'Japonais',
  PATISSERIE: 'Pâtisserie',
  AUTRE: 'Autre',
}
// ✅ ordre sans coquille + fallback géré plus bas
const order = ['BURGER', 'PIZZA', 'JAPONAIS', 'PATISSERIE', 'AUTRE']

const norm = (s) =>
  (s ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

const haystack = (r) =>
  norm(`${r.name ?? ''} ${r.description ?? ''} ${r.address ?? ''} ${r.category ?? ''}`)

export default function Restaurants() {
  const [all, setAll] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    let mounted = true
    setLoading(true)
    api.get('/api/restaurants')
      .then((data) => mounted && (setAll(data), setMsg('')))
      .catch((e) => setMsg(e?.message || 'Erreur de chargement'))
      .finally(() => mounted && setLoading(false))
    return () => { mounted = false }
  }, [])

  /* recherche texte */
  const results = useMemo(() => {
    const s = norm(q.trim())
    if (!s) return all
    return all.filter((r) => haystack(r).includes(s))
  }, [q, all])

  /* groupé par catégorie quand pas de recherche */
  const grouped = useMemo(() => {
    const map = new Map()
    for (const r of all) {
      const cat = r.category || 'AUTRE'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat).push(r)
    }
    return map
  }, [all])

  return (
    <div className="container py-4 sm:py-6 space-y-6">
      {/* barre recherche collée sous la nav */}
      <section className="rounded-2xl border border-zinc-200 bg-white/70 backdrop-blur p-3 sm:p-4 sticky top-[3.25rem] sm:top-[3.5rem] z-10">
        <div className="flex items-center rounded-xl border border-zinc-200 bg-white p-2 shadow-sm">
          <svg width="18" height="18" viewBox="0 0 24 24" className="mx-2 opacity-60">
            <path
              fill="currentColor"
              d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 5L20.5 19zM9.5 14C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14"
            />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="input !border-0 !shadow-none focus:ring-0 text-sm"
            placeholder="Rechercher un restaurant ou une cuisine…"
          />
          {q && (
            <button
              className="ml-2 rounded-md px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100"
              onClick={() => setQ('')}
            >
              Effacer
            </button>
          )}
        </div>
      </section>

      {loading && <div className="text-zinc-600">Chargement…</div>}
      {msg && <div className="rounded-xl bg-red-50 p-3 text-red-700">{msg}</div>}

      {q.trim() ? (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {results.length} résultat{results.length > 1 ? 's' : ''}
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((r) => (
              <RestaurantCard key={r.id} r={r} />
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.keys())
            .sort((a, b) => {
              const ia = order.indexOf(a); const ib = order.indexOf(b)
              return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib) // ✅ fallback ordre
            })
            .map((cat) => (
              <RestaurantRow
                key={cat}
                title={LABELS[cat] || 'Autre'}
                items={grouped.get(cat)}
                onSeeAll={() => setQ((LABELS[cat] || cat).toLowerCase())}
              />
            ))}
        </div>
      )}
    </div>
  )
}
