import { Router } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'

const router = Router()

const previewSchema = z.object({
  restaurantId: z.number().int(),
  items: z.array(z.object({ menuItemId: z.number().int(), quantity: z.number().int().positive() }))
})

router.post('/preview', async (req, res) => {
  try {
    const { restaurantId, items } = previewSchema.parse(req.body)
    const ids = items.map(i => i.menuItemId)
    const menuItems = await prisma.menuItem.findMany({ where: { id: { in: ids } } })
    const priceMap = new Map(menuItems.map(m => [m.id, m.priceCents]))
    let subtotal = 0
    for (const it of items) subtotal += (priceMap.get(it.menuItemId) || 0) * it.quantity
    const deliveryFee = 299
    const totalCents = subtotal + deliveryFee
    res.json({ subtotalCents: subtotal, deliveryFee, totalCents })
  } catch (e) { res.status(400).json({ error: e.message }) }
})

export default router
