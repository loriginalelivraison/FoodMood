import { Router } from 'express'
import { authRequired } from '../middleware/auth.js'
import prisma from '../lib/prisma.js'
import { z } from 'zod'

const router = Router()

router.get('/', authRequired, async (req, res) => {
  const cart = await prisma.cart.findUnique({
    where: { userId: req.user.id },
    include: { items: true }
  })
  res.json(cart || { items: [] })
})

const setSchema = z.object({
  restaurantId: z.number().optional().nullable(),
  items: z.array(z.object({ menuItemId: z.number().int(), quantity: z.number().int().positive() }))
})

router.post('/', authRequired, async (req, res) => {
  const data = setSchema.parse(req.body)
  const cart = await prisma.cart.upsert({
    where: { userId: req.user.id },
    create: { userId: req.user.id, restaurantId: data.restaurantId || null, items: { create: data.items } },
    update: {
      restaurantId: data.restaurantId || null,
      items: { deleteMany: {}, create: data.items }
    },
    include: { items: true }
  })
  res.json(cart)
})

router.delete('/', authRequired, async (req, res) => {
  await prisma.cart.deleteMany({ where: { userId: req.user.id } })
  res.json({ ok: true })
})

export default router
