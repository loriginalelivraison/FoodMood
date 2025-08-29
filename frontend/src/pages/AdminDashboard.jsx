// src/pages/AdminDashboard.jsx
import { useEffect, useMemo, useState } from 'react'
import api from '../utils/client.js'
import { useAuth } from '../auth/useAuth.jsx'

/* ---------- Petits composants UI ---------- */
function Card({ className = '', children }) {
  return (
    <div className={`rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm ${className}`}>
      {children}
    </div>
  )
}
function Stat({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-extrabold">{value}</div>
      {hint ? <div className="mt-1 text-xs text-zinc-500">{hint}</div> : null}
    </div>
  )
}
function Pill({ children, tone = 'default' }) {
  const map = {
    default: 'bg-zinc-100 text-zinc-700',
    green: 'bg-emerald-100 text-emerald-700',
    blue: 'bg-sky-100 text-sky-700',
    orange: 'bg-orange-100 text-orange-700',
    red: 'bg-rose-100 text-rose-700',
    gray: 'bg-zinc-100 text-zinc-700',
  }
  return <span className={`px-2 py-0.5 rounded-full text-xs ${map[tone]}`}>{children}</span>
}
function Money({ cents }) {
  const v = (Number(cents || 0) / 100).toFixed(2)
  return <span>{v} €</span>
}
function StatusBadge({ status }) {
  const tone =
    status === 'DELIVERED' ? 'green'
    : status === 'DELIVERING' ? 'blue'
    : status === 'PREPARING' || status === 'ACCEPTED' ? 'orange'
    : status === 'CANCELED' || status === 'ARCHIVED' ? 'red'
    : 'gray'
  return <Pill tone={tone}>{status}</Pill>
}

/* ---------- Utils export CSV ---------- */
function toCSV(rows) {
  const esc = (v) => {
    if (v == null) return ''
    const s = String(v)
    if (s.includes('"') || s.includes(',') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }
  const header = Object.keys(rows[0] || {}).map(esc).join(',')
  const body = rows.map(r => Object.keys(rows[0] || {}).map(k => esc(r[k])).join(',')).join('\n')
  return header + '\n' + body
}
function downloadCSV(filename, rows) {
  if (!rows || !rows.length) return
  const blob = new Blob([toCSV(rows)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/* ---------- Mini chart (SVG) ---------- */
function RevenueChart({ data }) {
  // data: [{date: 'YYYY-MM-DD', cents: number}]
  const w = 680, h = 220, pad = 28
  const max = Math.max(1, ...data.map(d => d.cents))
  const bw = Math.max(8, (w - pad*2) / Math.max(1, data.length))
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} className="rounded-2xl border border-zinc-200 bg-white">
      {/* axes */}
      <line x1={pad} y1={h-pad} x2={w-pad/2} y2={h-pad} stroke="#e5e7eb" />
      <line x1={pad} y1={pad/2} x2={pad} y2={h-pad} stroke="#e5e7eb" />
      {/* bars */}
      {data.map((d, i) => {
        const x = pad + i*bw + 4
        const barH = Math.round(((d.cents)/max) * (h - pad*1.8))
        const y = (h - pad) - barH
        return (
          <g key={d.date}>
            <rect x={x} y={y} width={bw-8} height={barH} fill="#f97316" opacity="0.85" rx="6" />
          </g>
        )
      })}
      {/* labels (x every ~5 bars) */}
      {data.map((d,i) => (i % Math.ceil(data.length/6) === 0) && (
        <text key={'lx'+d.date} x={pad + i*bw + bw/2} y={h-8} textAnchor="middle" fontSize="10" fill="#6b7280">
          {d.date.slice(5)}
        </text>
      ))}
      {/* max label */}
      <text x={pad} y={12} fontSize="10" fill="#6b7280">{(max/100).toFixed(2)} €</text>
    </svg>
  )
}

/* ---------- Page ---------- */
export default function AdminDashboard() {
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const [orders, setOrders] = useState([])
  const [restaurants, setRestaurants] = useState([])
  const [users, setUsers] = useState([])

  // Recherches
  const [qOrders, setQOrders] = useState('')
  const [qRests, setQRests] = useState('')
  const [qCouriers, setQCouriers] = useState('')

  // Panneau détails livreur
  const [openCourier, setOpenCourier] = useState(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setErr('')
    ;(async () => {
      try {
        const allOrders = await api.get('/api/orders/my', token)     // ADMIN => tout
        const restos = await api.get('/api/restaurants', token)
        let us = []
        try { us = await api.get('/api/users', token) } catch {}

        if (!mounted) return
        setOrders(allOrders || [])
        setRestaurants(restos || [])
        setUsers(us || [])
      } catch (e) {
        console.error(e)
        if (!mounted) return
        setErr(e?.message || 'Chargement impossible')
      } finally {
        mounted && setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [token])

  const userById = useMemo(() => {
    const map = new Map()
    for (const u of users) map.set(u.id, u)
    return map
  }, [users])

  /* ---------- KPIs ---------- */
  const kpis = useMemo(() => {
    const totalOrders = orders.length
    const delivered = orders.filter(o => o.status === 'DELIVERED').length
    const canceled  = orders.filter(o => o.status === 'CANCELED').length
    const revenueCents = orders
      .filter(o => o.status === 'DELIVERED' || o.status === 'ARCHIVED')
      .reduce((sum, o) => sum + (o.totalCents || 0), 0)

    const countByRole = users.length
      ? users.reduce((acc, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc }, {})
      : {}

    return {
      totalOrders,
      delivered,
      canceled,
      revenueCents,
      nbCustomers: countByRole['CUSTOMER'] || 0,
      nbOwners:    countByRole['OWNER']    || 0,
      nbCouriers:  countByRole['COURIER']  || 0,
      nbAdmins:    countByRole['ADMIN']    || 0,
    }
  }, [orders, users])

  /* ---------- Agrégations ---------- */
  // CA par restaurant
  const revenueByRestaurant = useMemo(() => {
    const map = new Map()
    for (const o of orders) {
      if (!o.restaurantId) continue
      const rid = o.restaurantId
      const key = map.get(rid) || {
        id: rid,
        name: o.restaurant?.name || `#${rid}`,
        totalCents: 0,
        orders: 0,
      }
      if (['DELIVERED','ARCHIVED'].includes(o.status)) key.totalCents += (o.totalCents || 0)
      key.orders += 1
      map.set(rid, key)
    }
    return Array.from(map.values()).sort((a, b) => b.totalCents - a.totalCents)
  }, [orders])

  // Stats livreurs
  const courierStats = useMemo(() => {
    const map = new Map() // courierId => { courierId, name, deliveries, sumCents, active }
    for (const o of orders) {
      if (!o.courierId) continue
      const u = userById.get(o.courierId)
      const key = map.get(o.courierId) || {
        courierId: o.courierId,
        name: (o.courier?.name || u?.name || `Livreur #${o.courierId}`),
        deliveries: 0, sumCents: 0, active: 0,
      }
      const deliveredLike = (o.status === 'DELIVERED' || o.status === 'ARCHIVED')
      if (deliveredLike) { key.deliveries += 1; key.sumCents += (o.totalCents || 0) }
      const isActive = ['PENDING','ACCEPTED','PREPARING','PICKED_UP','DELIVERING'].includes(o.status)
      if (isActive) key.active += 1
      map.set(o.courierId, key)
    }
    return Array.from(map.values()).sort((a, b) => b.deliveries - a.deliveries || b.active - a.active)
  }, [orders, userById])

  // Commandes récentes filtrées
  const recentOrders = useMemo(() => {
    const norm = (s) => (s ?? '').toString().toLowerCase()
    const q = norm(qOrders.trim())
    const list = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    if (!q) return list.slice(0, 50)
    return list.filter(o => {
      const str = [
        `#${o.id}`,
        o.restaurant?.name,
        o.customer?.name,
        o.status,
        o.deliveryAddress
      ].filter(Boolean).join(' ').toLowerCase()
      return str.includes(q)
    }).slice(0, 100)
  }, [orders, qOrders])

  // Restaurants filtrés
  const filteredRestaurants = useMemo(() => {
    const q = (qRests ?? '').toLowerCase()
    if (!q) return restaurants
    return restaurants.filter(r =>
      `${r.name} ${r.address} ${r.category}`.toLowerCase().includes(q)
    )
  }, [restaurants, qRests])

  // Livreurs filtrés
  const filteredCouriers = useMemo(() => {
    const q = (qCouriers ?? '').toLowerCase()
    if (!q) return courierStats
    return courierStats.filter(c => (c.name || '').toLowerCase().includes(q) || String(c.courierId).includes(q))
  }, [courierStats, qCouriers])

  // CA par jour (livrées + archivées)
  const revenuePerDay = useMemo(() => {
    const map = new Map()
    for (const o of orders) {
      if (!['DELIVERED','ARCHIVED'].includes(o.status)) continue
      const d = new Date(o.createdAt)
      const key = d.toISOString().slice(0,10) // YYYY-MM-DD
      map.set(key, (map.get(key) || 0) + (o.totalCents || 0))
    }
    return Array.from(map.entries())
      .sort((a,b)=> a[0].localeCompare(b[0]))
      .map(([date, cents]) => ({ date, cents }))
  }, [orders])

  /* ---------- Exports ---------- */
  function exportOrdersCSV() {
    const rows = orders.map(o => ({
      id: o.id,
      createdAt: new Date(o.createdAt).toISOString(),
      restaurant: o.restaurant?.name || o.restaurantId,
      customer: o.customer?.name || o.customerId,
      courier: o.courier?.name || o.courierId || '',
      status: o.status,
      total_eur: (o.totalCents/100).toFixed(2),
      address: o.deliveryAddress || '',
    }))
    downloadCSV('orders.csv', rows)
  }
  function exportRestaurantsCSV() {
    const agg = new Map(revenueByRestaurant.map(r => [r.id, r]))
    const rows = restaurants.map(r => ({
      id: r.id,
      name: r.name,
      address: r.address,
      category: r.category,
      isOpen: r.isOpen ? 'yes' : 'no',
      revenue_eur: ((agg.get(r.id)?.totalCents || 0)/100).toFixed(2),
      orders: agg.get(r.id)?.orders || 0,
    }))
    downloadCSV('restaurants.csv', rows)
  }
  function exportCouriersCSV() {
    const rows = courierStats.map(c => ({
      courier_id: c.courierId,
      name: c.name,
      active_orders: c.active,
      delivered_or_archived: c.deliveries,
      carried_revenue_eur: (c.sumCents/100).toFixed(2),
    }))
    downloadCSV('couriers.csv', rows)
  }

  /* ---------- Rendu ---------- */
  if (loading) return <div className="container py-6">Chargement…</div>
  if (err) return <div className="container py-6 text-red-600">{err}</div>

  return (
    <div className="container py-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Tableau de bord — Admin</h1>
          <p className="text-sm text-zinc-600">Vue globale : commandes, revenus, partenaires et livreurs.</p>
        </div>

        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={exportOrdersCSV}>Export commandes (CSV)</button>
          <button className="btn-secondary" onClick={exportRestaurantsCSV}>Export restaurants (CSV)</button>
          <button className="btn-secondary" onClick={exportCouriersCSV}>Export livreurs (CSV)</button>
        </div>
      </header>

      {/* KPIs */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Commandes (total)" value={kpis.totalOrders} />
        <Stat label="Livrées" value={kpis.delivered} hint="Tous temps" />
        <Stat label="Annulées" value={kpis.canceled} />
        <Stat label="Revenus cumulés" value={<Money cents={kpis.revenueCents} />} />
      </section>

      {/* Acteurs */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Clients" value={kpis.nbCustomers} />
        <Stat label="Restaurateurs" value={kpis.nbOwners} />
        <Stat label="Livreurs" value={kpis.nbCouriers} />
        <Stat label="Admins" value={kpis.nbAdmins} />
      </section>

      {/* Graph CA par jour */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Chiffre d’affaires par jour</h2>
          <div className="text-xs text-zinc-500">
            {revenuePerDay.length ? `De ${revenuePerDay[0].date} à ${revenuePerDay[revenuePerDay.length-1].date}` : 'Aucune donnée'}
          </div>
        </div>
        <RevenueChart data={revenuePerDay} />
      </Card>

      {/* Commandes récentes + recherche */}
      <section className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Commandes</h2>
            <input
              value={qOrders}
              onChange={(e)=>setQOrders(e.target.value)}
              className="input w-64 max-w-full"
              placeholder="Rechercher #id, client, resto, statut…"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="text-left text-zinc-500">
                  <th className="py-2">#</th>
                  <th className="py-2">Restaurant</th>
                  <th className="py-2">Client</th>
                  <th className="py-2">Statut</th>
                  <th className="py-2">Total</th>
                  <th className="py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(o => (
                  <tr key={o.id} className="border-t">
                    <td className="py-2 font-medium">#{o.id}</td>
                    <td className="py-2">{o.restaurant?.name || `Resto #${o.restaurantId}`}</td>
                    <td className="py-2">{o.customer?.name || `Client #${o.customerId}`}</td>
                    <td className="py-2"><StatusBadge status={o.status} /></td>
                    <td className="py-2"><Money cents={o.totalCents} /></td>
                    <td className="py-2">{new Date(o.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
                {!recentOrders.length && (
                  <tr><td colSpan="6" className="py-6 text-center text-zinc-500">Aucune commande.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Top restaurants + recherche */}
        <Card className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Restaurants</h2>
            <input
              value={qRests}
              onChange={(e)=>setQRests(e.target.value)}
              className="input w-56 max-w-full"
              placeholder="Filtrer par nom, adresse…"
            />
          </div>
          <div className="space-y-2">
            {filteredRestaurants.slice(0, 50).map((r) => {
              const top = revenueByRestaurant.find(x => x.id === r.id)
              return (
                <div key={r.id} className="flex items-center justify-between rounded-xl border p-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{r.name}</div>
                    <div className="text-xs text-zinc-500 truncate">{r.address}</div>
                    <div className="mt-1 text-xs">
                      {r.isOpen ? <Pill tone="green">Ouvert</Pill> : <Pill tone="red">Fermé</Pill>}
                      {r.category ? <span className="ml-2"><Pill>{r.category}</Pill></span> : null}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold"><Money cents={top?.totalCents || 0} /></div>
                    <div className="text-xs text-zinc-500">{top?.orders || 0} cmdes</div>
                  </div>
                </div>
              )
            })}
            {!filteredRestaurants.length && (
              <div className="text-sm text-zinc-500">Aucun restaurant.</div>
            )}
          </div>
        </Card>
      </section>

      {/* Livreurs — table + recherche + détails cliquables */}
      <Card>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Livreurs</h2>
          <input
            value={qCouriers}
            onChange={(e)=>setQCouriers(e.target.value)}
            className="input w-56 max-w-full"
            placeholder="Filtrer par nom ou #id…"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-zinc-500">
                <th className="py-2">Livreur</th>
                <th className="py-2">Actives</th>
                <th className="py-2">Livrées/Arch.</th>
                <th className="py-2">CA transporté</th>
                <th className="py-2">Détails</th>
              </tr>
            </thead>
            <tbody>
              {filteredCouriers.map(c => (
                <tr key={c.courierId} className="border-t">
                  <td className="py-2">{c.name} <span className="text-xs text-zinc-500">#{c.courierId}</span></td>
                  <td className="py-2">{c.active}</td>
                  <td className="py-2">{c.deliveries}</td>
                  <td className="py-2"><Money cents={c.sumCents} /></td>
                  <td className="py-2">
                    <button className="btn" onClick={() => setOpenCourier(c)}>Voir</button>
                  </td>
                </tr>
              ))}
              {!filteredCouriers.length && (
                <tr><td colSpan="5" className="py-6 text-center text-zinc-500">Aucun livreur trouvé.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Panneau de détails livreur */}
      {openCourier && (
        <CourierDetails
          courier={openCourier}
          onClose={()=>setOpenCourier(null)}
          orders={orders}
          user={userById.get(openCourier.courierId)}
        />
      )}
    </div>
  )
}

/* ---------- Détails livreur (panneau) ---------- */
function CourierDetails({ courier, onClose, orders, user }) {
  const active = orders.filter(o => o.courierId === courier.courierId && ['PENDING','ACCEPTED','PREPARING','PICKED_UP','DELIVERING'].includes(o.status))
  const delivered = orders
    .filter(o => o.courierId === courier.courierId && (o.status === 'DELIVERED' || o.status === 'ARCHIVED'))
    .sort((a,b) => new Date(b.updatedAt||b.createdAt) - new Date(a.updatedAt||a.createdAt))
    .slice(0, 15)

  const info = [
    ['Nom', user?.name || courier.name],
    ['Téléphone', user?.phone || '—'],
    ['ID', courier.courierId],
    ['Actives', active.length],
    ['Livrées/Arch.', courier.deliveries],
    ['CA transporté', `${(courier.sumCents/100).toFixed(2)} €`],
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/30 sm:items-center">
      <div className="mx-auto w-full max-w-3xl rounded-t-2xl bg-white shadow-lg sm:rounded-2xl">
        <div className="flex items-center justify-between border-b p-4">
          <div className="text-lg font-semibold">Livreur — {courier.name} <span className="text-xs text-zinc-500">#{courier.courierId}</span></div>
          <button className="btn-secondary" onClick={onClose}>Fermer</button>
        </div>

        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <Card>
            <div className="font-semibold mb-2">Informations</div>
            <ul className="text-sm space-y-1">
              {info.map(([k,v])=>(
                <li key={k} className="flex justify-between gap-3">
                  <span className="text-zinc-500">{k}</span>
                  <span className="font-medium">{v}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <div className="font-semibold mb-2">Courses actives</div>
            {active.length ? (
              <ul className="text-sm space-y-2">
                {active.map(o=>(
                  <li key={o.id} className="rounded-lg border p-2">
                    <div className="flex justify-between">
                      <div className="font-medium">#{o.id} — {o.restaurant?.name}</div>
                      <StatusBadge status={o.status} />
                    </div>
                    <div className="text-xs text-zinc-500 mt-1 truncate">{o.deliveryAddress}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-zinc-500">Aucune course active.</div>
            )}
          </Card>

          <Card className="sm:col-span-2">
            <div className="font-semibold mb-2">Dernières livraisons</div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="text-left text-zinc-500">
                    <th className="py-2">#</th>
                    <th className="py-2">Restaurant</th>
                    <th className="py-2">Client</th>
                    <th className="py-2">Total</th>
                    <th className="py-2">Statut</th>
                    <th className="py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {delivered.map(o=>(
                    <tr key={o.id} className="border-t">
                      <td className="py-2 font-medium">#{o.id}</td>
                      <td className="py-2">{o.restaurant?.name || `Resto #${o.restaurantId}`}</td>
                      <td className="py-2">{o.customer?.name || `Client #${o.customerId}`}</td>
                      <td className="py-2"><Money cents={o.totalCents} /></td>
                      <td className="py-2"><StatusBadge status={o.status} /></td>
                      <td className="py-2">{new Date(o.updatedAt || o.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                  {!delivered.length && (
                    <tr><td colSpan="6" className="py-6 text-center text-zinc-500">Aucune livraison récente.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
