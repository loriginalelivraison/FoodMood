// src/pages/OwnerDashboard.jsx
import { useEffect, useState } from 'react'
import api from '../utils/client.js'
import { useAuth } from '../auth/useAuth.jsx'
import ImageUploader from '../components/ImageUploader.jsx'
import MapPicker from '../components/MapPicker.jsx'
import { Link } from 'react-router-dom'

export default function OwnerDashboard() {
  const { user, token } = useAuth()
  const [restaurants, setRestaurants] = useState([])
  const [form, setForm] = useState({
    name: '', description: '', address: '', imageUrl: '', category: 'AUTRE',
    lat: null, lng: null, isOpen: true,
  })
  const [selected, setSelected] = useState(null)
  const [menuForm, setMenuForm] = useState({ name: '', description: '', priceCents: 1000, imageUrl: '' })
  const [msg, setMsg] = useState('')

  async function load() {
    setMsg('')
    const all = await api.get('/api/restaurants')
    setRestaurants(user?.role === 'OWNER' ? all.filter(r => r.ownerId === user?.id) : all)
  }
  useEffect(()=>{ load() }, [])

  // --- GEO helpers
  async function geocode(addr) {
    try {
      const r = await api.post('/api/geocode', { address: addr }, token)
      return r // {lat, lng} ou null
    } catch {
      return null
    }
  }

  // ----- CRUD RESTAURANT
  async function createRestaurant(e) {
    e.preventDefault()
    setMsg('')
    try {
      const payload = { ...form }
      // si pas de lat/lng, on tente de géocoder l’adresse (backup côté back aussi)
      if ((!payload.lat || !payload.lng) && payload.address?.trim()) {
        const p = await geocode(payload.address.trim())
        if (p) { payload.lat = p.lat; payload.lng = p.lng }
      }
      await api.post('/api/restaurants', payload, token)
      setForm({ name: '', description: '', address: '', imageUrl: '', category: 'AUTRE', lat: null, lng: null, isOpen: true })
      await load()
    } catch (e) {
      setMsg(e?.message || "Création échouée")
    }
  }

  async function updateRestaurant(e) {
    e.preventDefault()
    if (!selected) return
    setMsg('')
    try {
      const payload = { ...selected }
      // si on a une adresse mais pas de coords, tente géocode
      if ((!payload.lat || !payload.lng) && payload.address?.trim()) {
        const p = await geocode(payload.address.trim())
        if (p) { payload.lat = p.lat; payload.lng = p.lng }
      }
      await api.put(`/api/restaurants/${selected.id}`, payload, token)
      await load()
    } catch (e) {
      setMsg(e?.message || "Mise à jour échouée")
    }
  }

  async function removeRestaurant(id) {
    if (!confirm('Supprimer ce restaurant ?')) return
    await api.delete(`/api/restaurants/${id}`, token)
    setSelected(null); await load()
  }

  // ----- MENU
  async function addMenu(e) {
    e.preventDefault()
    if (!selected) return
    const body = { ...menuForm, priceCents: Number(menuForm.priceCents) }
    await api.post(`/api/restaurants/${selected.id}/menu`, body, token)
    setMenuForm({ name: '', description: '', priceCents: 1000, imageUrl: '' })
    const full = await api.get(`/api/restaurants/${selected.id}`)
    setSelected(full)
  }
  async function softDeleteMenu(id) {
    if (!selected) return
    if (!confirm('Supprimer ce plat ?')) return
    await api.delete(`/api/restaurants/${selected.id}/menu/${id}`, token)
    const full = await api.get(`/api/restaurants/${selected.id}`)
    setSelected(full)
  }

  return (
    <div className="space-y-10">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Espace restaurateur</h1>
        <Link className="btn" to="/owner/orders">Voir les commandes</Link>
      </header>

      {msg && <div className="p-3 rounded bg-red-50 text-red-700">{msg}</div>}

      {/* Créer */}
      <section className="card">
        <h2 className="text-xl font-semibold mb-3">Créer un restaurant</h2>
        <form onSubmit={createRestaurant} className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Nom</label>
            <input className="input" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} required />
          </div>
          <div>
            <label className="label">Adresse</label>
            <input className="input" value={form.address} onChange={e=>setForm({...form, address:e.target.value})} required />
            <button
              type="button"
              className="btn-secondary mt-2"
              onClick={async ()=>{
                if (!form.address?.trim()) return
                const p = await geocode(form.address.trim())
                if (p) setForm(f => ({...f, lat:p.lat, lng:p.lng}))
                else alert('Adresse introuvable')
              }}
            >
              Géocoder l’adresse
            </button>
          </div>

          <div>
            <label className="label">Catégorie</label>
            <select className="input" value={form.category} onChange={e=>setForm({...form, category:e.target.value})}>
              <option value="AUTRE">Autre</option>
              <option value="BURGER">Burger</option>
              <option value="PIZZA">Pizza</option>
              <option value="JAPONAIS">Japonais</option>
              <option value="PATISSERIE">Pâtisserie</option>
            </select>
          </div>
          <div>
            <label className="label">Ouvert</label>
            <select className="input" value={form.isOpen ? '1' : '0'} onChange={e=>setForm({...form, isOpen: e.target.value==='1'})}>
              <option value="1">Oui</option>
              <option value="0">Non</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="label">Description</label>
            <textarea className="input" value={form.description||''} onChange={e=>setForm({...form, description:e.target.value})} />
          </div>

          <div>
            <label className="label">Image</label>
            <ImageUploader onUploaded={url=>setForm({...form, imageUrl:url})} />
            {form.imageUrl && <img src={form.imageUrl} className="mt-2 h-20 rounded" />}
          </div>

          <div>
            <label className="label">Position (lat/lng)</label>
            <div className="flex gap-2">
              <input className="input" placeholder="lat" value={form.lat ?? ''} onChange={e=>setForm({...form, lat: e.target.value ? Number(e.target.value) : null})} />
              <input className="input" placeholder="lng" value={form.lng ?? ''} onChange={e=>setForm({...form, lng: e.target.value ? Number(e.target.value) : null})} />
            </div>
            <div className="mt-2">
              <MapPicker
                value={(form.lat!=null && form.lng!=null) ? {lat:form.lat,lng:form.lng} : null}
                onChange={(p)=>setForm(f=>({ ...f, lat:p?.lat ?? null, lng:p?.lng ?? null }))}
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <button className="btn">Créer</button>
          </div>
        </form>
      </section>

      {/* Liste + édition */}
      <section className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <h2 className="text-xl font-semibold mb-3">Mes restaurants</h2>
          <ul className="space-y-3">
            {restaurants.map(r => (
              <li key={r.id} className={`card cursor-pointer ${selected?.id===r.id ? 'ring-2 ring-orange-500' : ''}`}
                  onClick={async ()=>{ const full=await api.get(`/api/restaurants/${r.id}`); setSelected(full) }}>
                <div className="flex items-center gap-3">
                  {r.imageUrl && <img src={r.imageUrl} className="h-12 w-12 rounded object-cover" />}
                  <div>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-zinc-500">{r.address}</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-2 space-y-6">
          {selected ? (
            <>
              <div className="card">
                <h3 className="text-lg font-semibold mb-3">Éditer “{selected.name}”</h3>
                <form onSubmit={updateRestaurant} className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Nom</label>
                    <input className="input" value={selected.name} onChange={e=>setSelected({...selected, name:e.target.value})} />
                  </div>
                  <div>
                    <label className="label">Adresse</label>
                    <input className="input" value={selected.address||''} onChange={e=>setSelected({...selected, address:e.target.value})} />
                    <button
                      type="button"
                      className="btn-secondary mt-2"
                      onClick={async ()=>{
                        if (!selected.address?.trim()) return
                        const p = await geocode(selected.address.trim())
                        if (p) setSelected(s=>({...s, lat:p.lat, lng:p.lng}))
                        else alert('Adresse introuvable')
                      }}
                    >
                      Géocoder l’adresse
                    </button>
                  </div>

                  <div>
                    <label className="label">Catégorie</label>
                    <select className="input" value={selected.category||'AUTRE'} onChange={e=>setSelected({...selected, category:e.target.value})}>
                      <option value="AUTRE">Autre</option>
                      <option value="BURGER">Burger</option>
                      <option value="PIZZA">Pizza</option>
                      <option value="JAPONAIS">Japonais</option>
                      <option value="PATISSERIE">Pâtisserie</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Ouvert</label>
                    <select className="input" value={selected.isOpen ? '1' : '0'} onChange={e=>setSelected({...selected, isOpen: e.target.value==='1'})}>
                      <option value="1">Oui</option>
                      <option value="0">Non</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="label">Description</label>
                    <textarea className="input" value={selected.description||''} onChange={e=>setSelected({...selected, description:e.target.value})} />
                  </div>

                  <div>
                    <ImageUploader onUploaded={url=>setSelected({...selected, imageUrl:url})} label="Image du restaurant" />
                    {selected.imageUrl && <img src={selected.imageUrl} className="mt-2 h-20 rounded" />}
                  </div>

                  <div>
                    <label className="label">Position (lat/lng)</label>
                    <div className="flex gap-2">
                      <input className="input" placeholder="lat" value={selected.lat ?? ''} onChange={e=>setSelected({...selected, lat: e.target.value ? Number(e.target.value) : null})} />
                      <input className="input" placeholder="lng" value={selected.lng ?? ''} onChange={e=>setSelected({...selected, lng: e.target.value ? Number(e.target.value) : null})} />
                    </div>
                    <div className="mt-2">
                      <MapPicker
                        value={(selected.lat!=null && selected.lng!=null) ? {lat:selected.lat,lng:selected.lng} : null}
                        onChange={(p)=>setSelected(s=>({ ...s, lat:p?.lat ?? null, lng:p?.lng ?? null }))}
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2 flex gap-3">
                    <button className="btn">Enregistrer</button>
                    <button type="button" className="btn-secondary" onClick={()=>removeRestaurant(selected.id)}>Supprimer</button>
                  </div>
                </form>
              </div>

              <div className="card">
                <h3 className="text-lg font-semibold mb-3">Menu</h3>
                <form onSubmit={addMenu} className="grid md:grid-cols-4 gap-4 mb-6">
                  <div className="md:col-span-2">
                    <label className="label">Nom du plat</label>
                    <input className="input" value={menuForm.name} onChange={e=>setMenuForm({...menuForm, name:e.target.value})} required/>
                  </div>
                  <div>
                    <label className="label">Prix (cents)</label>
                    <input type="number" className="input" value={menuForm.priceCents} min="1"
                           onChange={e=>setMenuForm({...menuForm, priceCents:e.target.value})} required/>
                  </div>
                  <div>
                    <ImageUploader onUploaded={url=>setMenuForm({...menuForm, imageUrl:url})} label="Image du plat"/>
                    {menuForm.imageUrl && <img src={menuForm.imageUrl} className="mt-2 h-16 rounded" />}
                  </div>
                  <div className="md:col-span-4">
                    <label className="label">Description</label>
                    <textarea className="input" value={menuForm.description||''} onChange={e=>setMenuForm({...menuForm, description:e.target.value})}/>
                  </div>
                  <div className="md:col-span-4">
                    <button className="btn">Ajouter le plat</button>
                  </div>
                </form>

                <div className="grid sm:grid-cols-2 gap-4">
                  {(selected.menu||[]).map(item => (
                    <div key={item.id} className="border rounded-2xl p-3 flex gap-3 items-center">
                      {item.imageUrl && <img src={item.imageUrl} className="h-16 w-16 rounded object-cover" />}
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-zinc-500">{(item.priceCents/100).toFixed(2)} €</div>
                      </div>
                      <button className="btn-secondary" onClick={()=>softDeleteMenu(item.id)}>Supprimer</button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-zinc-500">Sélectionnez un restaurant à gauche pour le modifier.</div>
          )}
        </div>
      </section>
    </div>
  )
}
