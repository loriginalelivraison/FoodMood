import { Router } from 'express'
import fetch from 'node-fetch'
import { z } from 'zod'
import { authRequired } from '../middleware/auth.js'

const router = Router()
const schema = z.object({ address: z.string().min(3) })

// Simple proxy Nominatim (OpenStreetMap) pour éviter le CORS côté front
router.post('/', authRequired, async (req, res) => {
  try {
    const { address } = schema.parse(req.body)
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
    const r = await fetch(url, { headers: { 'User-Agent': 'foodgo-demo/1.0' } })
    const data = await r.json()
    if (!Array.isArray(data) || !data.length) return res.json(null)
    const best = data[0]
    res.json({ lat: Number(best.lat), lng: Number(best.lon) })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

export default router
