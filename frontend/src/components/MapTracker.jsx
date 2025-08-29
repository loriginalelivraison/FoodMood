// src/components/MapTracker.jsx
import { useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'

// petites icônes (Leaflet requiert des URLs absolues ou dataURI)
// Ici on utilise les icônes par défaut via un CDN
const icons = {
  restaurant: L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  }),
  courier: L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  }),
  customer: L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  }),
}

export default function MapTracker({ restaurant, delivery, courier }) {
  const mapEl = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef({})

  const center = useMemo(() => {
    // ordre de priorité pour centrer : livreur -> resto -> client -> Paris
    if (courier?.lat && courier?.lng) return [courier.lat, courier.lng]
    if (restaurant?.lat && restaurant?.lng) return [restaurant.lat, restaurant.lng]
    if (delivery?.lat && delivery?.lng) return [delivery.lat, delivery.lng]
    return [48.8566, 2.3522]
  }, [restaurant, delivery, courier])

  useEffect(() => {
    if (!mapEl.current) return
    if (!mapRef.current) {
      mapRef.current = L.map(mapEl.current).setView(center, 13)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(mapRef.current)
    } else {
      mapRef.current.setView(center)
    }

    const map = mapRef.current

    // (ré)afficher markers
    function upsertMarker(key, lat, lng, icon, popup) {
      if (!lat || !lng) return
      if (markersRef.current[key]) {
        markersRef.current[key].setLatLng([lat, lng]).setIcon(icon)
      } else {
        markersRef.current[key] = L.marker([lat, lng], { icon }).addTo(map)
      }
      if (popup) markersRef.current[key].bindPopup(popup)
    }

    if (restaurant?.lat && restaurant?.lng) {
      upsertMarker('restaurant', restaurant.lat, restaurant.lng, icons.restaurant, 'Restaurant')
    }
    if (delivery?.lat && delivery?.lng) {
      upsertMarker('customer', delivery.lat, delivery.lng, icons.customer, 'Livraison')
    }
    if (courier?.lat && courier?.lng) {
      upsertMarker('courier', courier.lat, courier.lng, icons.courier, 'Livreur')
    }

    return () => {}
  }, [center, restaurant, delivery, courier])

  return (
    <div ref={mapEl} className="w-full rounded-2xl border h-72" />
  )
}
