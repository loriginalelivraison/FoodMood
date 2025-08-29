// src/components/Map.jsx
import { useEffect } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export default function Map({ restaurant, customer, courier }) {
  useEffect(() => {
    const map = L.map('order-map', { center: [48.8566, 2.3522], zoom: 12 })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(map)

    const markers = []

    if (restaurant) {
      const m = L.marker([restaurant.lat, restaurant.lng]).addTo(map).bindPopup(`Resto: ${restaurant.label || ''}`)
      markers.push(m)
    }
    if (customer) {
      const m = L.marker([customer.lat, customer.lng]).addTo(map).bindPopup('Client')
      markers.push(m)
    }
    let courierMarker = null
    if (courier) {
      courierMarker = L.marker([courier.lat, courier.lng]).addTo(map).bindPopup('Livreur')
      markers.push(courierMarker)
    }

    if (markers.length) {
      const group = L.featureGroup(markers)
      map.fitBounds(group.getBounds().pad(0.3))
    }

    // live update du livreur
    let last = courier
    const id = setInterval(() => {
      if (!courier || !courierMarker) return
      if (last?.lat !== courier.lat || last?.lng !== courier.lng) {
        courierMarker.setLatLng([courier.lat, courier.lng])
        last = courier
      }
    }, 1000)

    return () => { clearInterval(id); map.remove() }
  }, [restaurant?.lat, restaurant?.lng, customer?.lat, customer?.lng]) // courier géré via interval

  return <div id="order-map" className="h-72 w-full rounded-2xl border" />
}
