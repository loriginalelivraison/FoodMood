// backend/src/lib/geocode.js
// Géocodage via Nominatim (OpenStreetMap) — pas de clé requise.
// On s’en sert à la création/mise à jour d’un restaurant et
// en fallback pour l’adresse de livraison si lat/lng manquent.

export async function geocodeAddress(address) {
  if (!address || typeof address !== 'string') return null
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('q', address)
    url.searchParams.set('format', 'json')
    url.searchParams.set('limit', '1')

    const res = await fetch(url, {
      headers: { 'User-Agent': 'foodgo-app/1.0 (contact@example.com)' },
    })
    if (!res.ok) return null
    const arr = await res.json()
    if (!Array.isArray(arr) || arr.length === 0) return null

    const { lat, lon } = arr[0]
    const fLat = parseFloat(lat)
    const fLng = parseFloat(lon)
    if (!Number.isFinite(fLat) || !Number.isFinite(fLng)) return null
    return { lat: fLat, lng: fLng }
  } catch {
    return null
  }
}
