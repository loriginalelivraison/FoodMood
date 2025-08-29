import { Router } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { authRequired, requireRole } from '../middleware/auth.js'
import { geocodeAddress } from '../lib/geocode.js'

const router = Router()

async function assertOwnerOfRestaurant(userId, restaurantId) {
  const r = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { ownerId: true },
  })
  if (!r) {
    const err = new Error('Restaurant not found')
    err.status = 404
    throw err
  }
  if (r.ownerId !== userId) {
    const err = new Error('Not your restaurant')
    err.status = 403
    throw err
  }
}

// liste publique
router.get('/', async (_req, res) => {
  const list = await prisma.restaurant.findMany({
    orderBy: { id: 'asc' },
    select: {
      id: true, name: true, imageUrl: true, description: true, address: true,
      ownerId: true, category: true, isOpen: true, lat: true, lng: true,
    },
  })
  res.json(list)
})

// détail public
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const r = await prisma.restaurant.findUnique({
    where: { id },
    include: { menu: { orderBy: { id: 'asc' } } },
  })
  if (!r) return res.status(404).json({ error: 'Not found' })
  res.json(r)
})

const restaurantSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  address: z.string().min(2),
  imageUrl: z.string().url().optional().nullable(),
  category: z.enum(['PIZZA','BURGER','JAPONAIS','PATISSERIE','AUTRE']).default('AUTRE'),
  isOpen: z.boolean().default(true),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
})

// create
router.post('/', authRequired, requireRole('OWNER','ADMIN'), async (req, res) => {
  try {
    const data = restaurantSchema.parse(req.body)
    let lat = data.lat ?? null
    let lng = data.lng ?? null

    if ((lat == null || lng == null) && data.address) {
      try {
        const p = await geocodeAddress(data.address)
        if (p) { lat = p.lat; lng = p.lng }
      } catch {}
    }

    const r = await prisma.restaurant.create({
      data: {
        name: data.name,
        description: data.description || null,
        address: data.address,
        imageUrl: data.imageUrl || null,
        category: data.category || 'AUTRE',
        isOpen: data.isOpen ?? true,
        lat, lng,
        ownerId: req.user.id,
      },
    })
    res.json(r)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

// update
router.put('/:id', authRequired, requireRole('OWNER','ADMIN'), async (req, res) => {
  try {
    const id = Number(req.params.id)
    await assertOwnerOfRestaurant(req.user.id, id)
    const data = restaurantSchema.partial().parse(req.body)

    let lat = data.lat ?? undefined
    let lng = data.lng ?? undefined

    // si adresse changée & pas de coords fournies, tente géocode
    if ((lat == null || lng == null) && typeof data.address === 'string' && data.address.trim()) {
      try {
        const p = await geocodeAddress(data.address)
        if (p) { lat = p.lat; lng = p.lng }
      } catch {}
    }

    const r = await prisma.restaurant.update({
      where: { id },
      data: {
        ...data,
        description: data.description ?? undefined,
        imageUrl: data.imageUrl ?? undefined,
        lat, lng,
      },
    })
    res.json(r)
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message })
  }
})

// delete
router.delete('/:id', authRequired, requireRole('OWNER','ADMIN'), async (req, res) => {
  try {
    const id = Number(req.params.id)
    await assertOwnerOfRestaurant(req.user.id, id)
    await prisma.restaurant.delete({ where: { id } })
    res.json({ ok: true })
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message })
  }
})

/* ===== MENU CRUD (create / patch / delete) ===== */

const menuSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  priceCents: z.number().int().positive(),
})

router.post('/:id/menu', authRequired, requireRole('OWNER','ADMIN'), async (req, res) => {
  try {
    const restaurantId = Number(req.params.id)
    await assertOwnerOfRestaurant(req.user.id, restaurantId)
    const body = menuSchema.parse({ ...req.body, priceCents: Number(req.body.priceCents) })
    const item = await prisma.menuItem.create({
      data: {
        restaurantId,
        name: body.name,
        description: body.description || null,
        imageUrl: body.imageUrl || null,
        priceCents: body.priceCents,
      },
    })
    res.json(item)
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message })
  }
})

const menuUpdateSchema = menuSchema.partial()

router.patch('/:id/menu/:itemId', authRequired, requireRole('OWNER','ADMIN'), async (req, res) => {
  try {
    const restaurantId = Number(req.params.id)
    const itemId = Number(req.params.itemId)
    await assertOwnerOfRestaurant(req.user.id, restaurantId)

    const item = await prisma.menuItem.findUnique({ where: { id: itemId } })
    if (!item || item.restaurantId !== restaurantId) {
      return res.status(404).json({ error: 'Menu item not found in this restaurant' })
    }

    const body = menuUpdateSchema.parse({
      ...req.body,
      priceCents: req.body.priceCents != null ? Number(req.body.priceCents) : undefined,
    })

    const updated = await prisma.menuItem.update({
      where: { id: itemId },
      data: {
        ...body,
        description: body.description ?? item.description,
        imageUrl: body.imageUrl ?? item.imageUrl,
      },
    })
    res.json(updated)
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message })
  }
})

router.delete('/:id/menu/:itemId', authRequired, requireRole('OWNER','ADMIN'), async (req, res) => {
  try {
    const restaurantId = Number(req.params.id)
    const itemId = Number(req.params.itemId)
    await assertOwnerOfRestaurant(req.user.id, restaurantId)

    const item = await prisma.menuItem.findUnique({ where: { id: itemId } })
    if (!item || item.restaurantId !== restaurantId) {
      return res.status(404).json({ error: 'Menu item not found in this restaurant' })
    }

    await prisma.menuItem.delete({ where: { id: itemId } })
    res.json({ ok: true })
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message })
  }
})

export default router
