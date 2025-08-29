// src/components/MapPicker.jsx
import { useEffect, useRef } from 'react'
import L from 'leaflet'

// Corrige l’icône Leaflet en bundlers modernes
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

/**
 * MapPicker
 * props:
 *  - value: {lat, lng} | null
 *  - onChange: (point: {lat,lng, address?}) => void
 *  - height: string (ex "300px")
 *  - defaultCenter: {lat,lng}
 */
export default function MapPicker({ value, onChange, height = '300px', defaultCenter = { lat: 48.8566, lng: 2.3522 } }) {
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const containerRef = useRef(null)

  // reverse geocoding via Nominatim (OSM)
  async function reverseGeocode(lat, lng) {
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
      const data = await resp.json()
      return data?.display_name || ''
    } catch {
      return ''
    }
  }

  useEffect(() => {
    if (mapRef.current) return // déjà initialisé
    const map = L.map(containerRef.current).setView([defaultCenter.lat, defaultCenter.lng], 13)
    mapRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map)

    // si on a déjà une valeur, place le marqueur
    if (value?.lat && value?.lng) {
      markerRef.current = L.marker([value.lat, value.lng]).addTo(map)
      map.setView([value.lat, value.lng], 15)
    }

    // click → set marker + onChange + reverse geocode
    map.on('click', async (e) => {
      const { lat, lng } = e.latlng
      if (!markerRef.current) {
        markerRef.current = L.marker([lat, lng]).addTo(map)
      } else {
        markerRef.current.setLatLng([lat, lng])
      }
      const address = await reverseGeocode(lat, lng)
      onChange?.({ lat, lng, address })
    })

    return () => {
      map.off()
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  // si value change depuis l’extérieur, recentrer/placer
  useEffect(() => {
    const map = mapRef.current
    if (!map || !value?.lat || !value?.lng) return
    if (!markerRef.current) {
      markerRef.current = L.marker([value.lat, value.lng]).addTo(map)
    } else {
      markerRef.current.setLatLng([value.lat, value.lng])
    }
    map.setView([value.lat, value.lng], 15)
  }, [value?.lat, value?.lng])

  return <div ref={containerRef} style={{ width: '100%', height, borderRadius: '12px', overflow: 'hidden' }} />
}
