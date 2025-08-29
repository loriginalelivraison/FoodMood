// src/components/LiveMap.jsx
// Carte légère basée sur pigeon-maps (compat. React 18)
// npm i pigeon-maps
import { Map, Overlay } from 'pigeon-maps'
import { useMemo } from 'react'

/** Petit point rond coloré */
function Dot({ color = '#111', title = '' }) {
  return (
    <div
      title={title}
      style={{
        width: 14,
        height: 14,
        borderRadius: 9999,
        background: color,
        border: '2px solid white',
        boxShadow: '0 0 0 2px rgba(0,0,0,.15)',
      }}
    />
  )
}

export default function LiveMap({
  restaurant,                  // { lat, lng, label? }
  delivery,                    // { lat, lng, label? }
  courier,                     // { lat, lng } (position du viewer si livreur)
  couriers = [],               // [{ courierId, lat, lng }]
  highlightedCourierId = null, // number | null → jaune
  height = '260px',
  showLegend = true,
}) {
  // On rassemble tous les points connus
  const points = useMemo(() => {
    const arr = []
    if (restaurant?.lat != null && restaurant?.lng != null) {
      arr.push({ lat: restaurant.lat, lng: restaurant.lng })
    }
    if (delivery?.lat != null && delivery?.lng != null) {
      arr.push({ lat: delivery.lat, lng: delivery.lng })
    }
    if (courier?.lat != null && courier?.lng != null) {
      arr.push({ lat: courier.lat, lng: courier.lng })
    }
    for (const c of couriers) {
      if (c?.lat != null && c?.lng != null) arr.push({ lat: c.lat, lng: c.lng })
    }
    return arr
  }, [restaurant, delivery, courier, couriers])

  // Centre: moyenne simple (très suffisant ici)
  const center = useMemo(() => {
    if (!points.length) return [48.8566, 2.3522] // fallback Paris
    const lat = points.reduce((s, p) => s + p.lat, 0) / points.length
    const lng = points.reduce((s, p) => s + p.lng, 0) / points.length
    return [lat, lng]
  }, [points])

  // Couleurs
  const COLOR = {
    restaurant: '#fb923c', // orange
    client:     '#3b82f6', // bleu
    courier:    '#22c55e', // vert
    claimed:    '#facc15', // jaune (livreur assigné)
  }

  return (
    <div>
      <div style={{ height, borderRadius: 16, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
        <Map defaultCenter={center} defaultZoom={13}>
          {/* Restaurant */}
          {restaurant?.lat != null && restaurant?.lng != null && (
            <Overlay anchor={[restaurant.lat, restaurant.lng]} offset={[7, 7]}>
              <Dot color={COLOR.restaurant} title={restaurant?.label || 'Restaurant'} />
            </Overlay>
          )}

          {/* Client (delivery) */}
          {delivery?.lat != null && delivery?.lng != null && (
            <Overlay anchor={[delivery.lat, delivery.lng]} offset={[7, 7]}>
              <Dot color={COLOR.client} title={delivery?.label || 'Client'} />
            </Overlay>
          )}

          {/* Position du viewer si livreur */}
          {courier?.lat != null && courier?.lng != null && (
            <Overlay anchor={[courier.lat, courier.lng]} offset={[7, 7]}>
              <Dot color={COLOR.courier} title="Moi (livreur)" />
            </Overlay>
          )}

          {/* Tous les livreurs (verts), le livreur assigné en jaune */}
          {(couriers || []).map((c) => {
            const isHighlighted =
              highlightedCourierId != null && String(c.courierId) === String(highlightedCourierId)
            const color = isHighlighted ? COLOR.claimed : COLOR.courier
            return (
              <Overlay key={c.courierId || `${c.lat}-${c.lng}`} anchor={[c.lat, c.lng]} offset={[7, 7]}>
                <Dot color={color} title={isHighlighted ? 'Livreur assigné' : 'Livreur'} />
              </Overlay>
            )
          })}
        </Map>
      </div>

      {/* Légende */}
      {showLegend && (
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-600">
          <span className="inline-flex items-center gap-1">
            <span style={{ width: 10, height: 10, borderRadius: 9999, background: COLOR.restaurant, display: 'inline-block' }} />
            Restaurant
          </span>
          <span className="inline-flex items-center gap-1">
            <span style={{ width: 10, height: 10, borderRadius: 9999, background: COLOR.client, display: 'inline-block' }} />
            Client
          </span>
          <span className="inline-flex items-center gap-1">
            <span style={{ width: 10, height: 10, borderRadius: 9999, background: COLOR.courier, display: 'inline-block' }} />
            Livreurs disponibles
          </span>
          <span className="inline-flex items-center gap-1">
            <span style={{ width: 10, height: 10, borderRadius: 9999, background: COLOR.claimed, display: 'inline-block' }} />
            Livreur assigné (en cours)
          </span>
        </div>
      )}
    </div>
  )
}
