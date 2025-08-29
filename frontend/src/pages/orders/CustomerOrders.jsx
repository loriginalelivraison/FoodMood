// src/pages/orders/CustomerOrders.jsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../utils/client.js'
import { useAuth } from '../../auth/useAuth.jsx'
import OrderStepBar from '../../components/OrderStepBar.jsx'

function StatusBadge({ status }) {
  const cls =
    status === 'DELIVERED'
      ? 'bg-emerald-100 text-emerald-700'
      : status === 'CANCELED'
      ? 'bg-rose-100 text-rose-700'
      : status === 'ARCHIVED'
      ? 'bg-zinc-200 text-zinc-700'
      : 'bg-zinc-100 text-zinc-700'
  return <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{status}</span>
}

export default function CustomerOrders() {
  const { token, user } = useAuth()
  const [tab, setTab] = useState('active') // 'active' | 'archived'
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  async function load(which = tab) {
    setLoading(true); setMsg('')
    try {
      const qs = which === 'archived' ? '?archived=1' : '' // works even if backend ignores it
      const list = await api.get(`/api/orders/my${qs}`, token)
      setOrders(list || [])
    } catch (e) {
      console.error(e); setMsg('Impossible de charger les commandes.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load('active') }, [])
  useEffect(() => { load(tab) }, [tab])

  async function confirmDelivered(id) {
    try {
      const up = await api.post(`/api/orders/${id}/confirm-delivered`, {}, token)
      setOrders(prev => prev.map(o => (o.id === up.id ? up : o)))
    } catch (e) {
      console.error(e); alert("Impossible de confirmer la réception.")
    }
  }

  const isArchivedView = tab === 'archived'
  // 🔒 front-end guard: hide/show ARCHIVED appropriately
  const displayed = isArchivedView
    ? orders.filter(o => o.status === 'ARCHIVED')
    : orders.filter(o => o.status !== 'ARCHIVED')

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mes commandes</h1>
        {user?.name && <div className="text-sm text-zinc-600">Bonjour, {user.name}</div>}
      </header>

      <div className="rounded-xl border p-1 inline-flex">
        <button
          onClick={() => setTab('active')}
          className={`px-3 py-1.5 rounded-lg text-sm ${tab==='active' ? 'bg-[var(--brand,#f97316)] text-white' : 'hover:bg-zinc-100'}`}
        >
          En cours
        </button>
        <button
          onClick={() => setTab('archived')}
          className={`px-3 py-1.5 rounded-lg text-sm ${tab==='archived' ? 'bg-[var(--brand,#f97316)] text-white' : 'hover:bg-zinc-100'}`}
        >
          Historique
        </button>
      </div>

      {msg && <div className="p-3 bg-red-50 text-red-700 rounded">{msg}</div>}
      {loading && <div className="text-zinc-600">Chargement…</div>}
      {!loading && !displayed.length && (
        <div className="text-zinc-600">
          {isArchivedView ? 'Aucune commande archivée.' : 'Vous n’avez pas de commande en cours.'}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {displayed.map(o => (
          <div key={o.id} className="card">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">Commande #{o.id}</div>
              <StatusBadge status={o.status} />
            </div>

            <div className="text-sm mb-2">{o.restaurant?.name}</div>

            <div className="mb-3"><OrderStepBar status={o.status} compact /></div>

            <ul className="text-xs text-zinc-600 mb-3 list-disc pl-4">
              {o.items?.slice(0,3).map(it => (
                <li key={it.id}>{it.quantity} × {it.menuItem?.name ?? 'Plat'}</li>
              ))}
              {o.items?.length > 3 && <li>…</li>}
            </ul>

            <div className="flex items-center justify-between">
              <div className="font-semibold">{(o.totalCents/100).toFixed(2)} €</div>
              <div className="flex items-center gap-2">
                <Link className="btn-secondary" to={`/orders/${o.id}`}>Suivi</Link>
                {o.status === 'DELIVERING' && !isArchivedView && (
                  <button className="btn" onClick={() => confirmDelivered(o.id)}>
                    Confirmer reçu
                  </button>
                )}
              </div>
            </div>

            {!isArchivedView && o.status === 'DELIVERED' && (
              <div className="mt-2 text-xs text-zinc-500">
                Cette commande sera archivée automatiquement sous peu.
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
