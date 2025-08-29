// src/routes/orders.js
import { Router } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { authRequired, requireRole } from '../middleware/auth.js'
import { geocodeAddress } from '../lib/geocode.js'

const router = Router()

const orderItemSchema = z.object({
  menuItemId: z.number().int(),
  quantity: z.number().int().positive(),
})

const createOrderSchema = z.object({
  restaurantId: z.number().int(),
  items: z.array(orderItemSchema).min(1),
  deliveryAddress: z.string().min(3),
  deliveryLat: z.number().optional(),
  deliveryLng: z.number().optional(),
})

/* ------------------------------------------------------------------ */
/* 1) CREATE (client)                                                  */
/* ------------------------------------------------------------------ */
router.post('/', authRequired, requireRole('CUSTOMER'), async (req, res) => {
  try {
    const data = createOrderSchema.parse(req.body)

    // prix
    const ids = data.items.map(i => i.menuItemId)
    const menuItems = await prisma.menuItem.findMany({ where: { id: { in: ids } } })
    const priceMap = new Map(menuItems.map(m => [m.id, m.priceCents]))

    // total
    let total = 0
    for (const it of data.items) total += (priceMap.get(it.menuItemId) || 0) * it.quantity
    const deliveryFee = 299
    total += deliveryFee

    // géocode adresse livraison si coords absentes
    let dLat = data.deliveryLat ?? null
    let dLng = data.deliveryLng ?? null
    if ((dLat == null || dLng == null) && data.deliveryAddress) {
      try {
        const pt = await geocodeAddress(data.deliveryAddress)
        if (pt) { dLat = pt.lat; dLng = pt.lng }
      } catch {}
    }

    const order = await prisma.order.create({
      data: {
        customerId: req.user.id,
        restaurantId: data.restaurantId,
        status: 'PENDING',
        deliveryAddress: data.deliveryAddress,
        deliveryLat: dLat,
        deliveryLng: dLng,
        totalCents: total,
        items: {
          create: data.items.map(it => ({
            menuItemId: it.menuItemId,
            quantity: it.quantity,
            priceCents: priceMap.get(it.menuItemId) || 0,
          })),
        },
      },
      include: {
        items: { include: { menuItem: true } },
        restaurant: true,
        courier: { select: { id: true, name: true, phone: true } },
      },
    })

    try {
      req.app.get('io')?.emit('order:created', {
        id: order.id,
        restaurantId: order.restaurantId,
        totalCents: order.totalCents,
      })
    } catch {}

    res.json(order)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

/* ------------------------------------------------------------------ */
/* 2) /api/orders/my (selon rôle)                                      */
/* ------------------------------------------------------------------ */
router.get('/my', authRequired, async (req, res) => {
  const role = req.user.role
  if (role === 'CUSTOMER') {
    const orders = await prisma.order.findMany({
      where: { customerId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { menuItem: true } },
        restaurant: true,
        courier: { select: { id: true, name: true, phone: true } },
      },
    })
    return res.json(orders)
  }
  if (role === 'OWNER') {
    const restaurants = await prisma.restaurant.findMany({
      where: { ownerId: req.user.id },
      select: { id: true },
    })
    const rids = restaurants.map(r => r.id)
    const orders = await prisma.order.findMany({
      where: { restaurantId: { in: rids } },
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { menuItem: true } },
        restaurant: true,
        courier: { select: { id: true, name: true, phone: true } },
      },
    })
    return res.json(orders)
  }
  if (role === 'COURIER') {
    const orders = await prisma.order.findMany({
      where: { courierId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { menuItem: true } },
        restaurant: true,
        courier: { select: { id: true, name: true, phone: true } },
      },
    })
    return res.json(orders)
  }
  if (role === 'ADMIN') {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { menuItem: true } },
        restaurant: true,
        courier: { select: { id: true, name: true, phone: true } },
      },
    })
    return res.json(orders)
  }
  res.json([])
})

/* ------------------------------------------------------------------ */
/* 3) DETAIL (+ dernière position du coursier)                         */
/* ------------------------------------------------------------------ */
router.get('/:id', authRequired, requireRole('CUSTOMER','OWNER','COURIER','ADMIN'), async (req, res) => {
  const id = Number(req.params.id)
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { menuItem: true } },
      restaurant: {
        select: { id: true, name: true, imageUrl: true, ownerId: true, lat: true, lng: true, address: true },
      },
      customer: { select: { id: true, name: true, phone: true } },
      courier:  { select: { id: true, name: true, phone: true } },
    },
  })
  if (!order) return res.status(404).json({ error: 'Order not found' })

  const isCustomer = order.customerId === req.user.id
  const isOwner = order.restaurant.ownerId === req.user.id
  const isCourier = order.courierId ? order.courierId === req.user.id : false
  const isAdmin = req.user.role === 'ADMIN'
  if (!(isCustomer || isOwner || isCourier || isAdmin)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  let courierPosition = null
  if (order.courierId) {
    courierPosition = await prisma.courierPosition.findUnique({
      where: { courierId: order.courierId },
      select: { lat: true, lng: true, updatedAt: true },
    })
  }
  res.json({ ...order, courierPosition })
})

/* ------------------------------------------------------------------ */
/* 4) OWNER transitions (PENDING -> ACCEPTED -> PREPARING)             */
/* ------------------------------------------------------------------ */
const ownerStatusSchema = z.object({ status: z.enum(['ACCEPTED','PREPARING']) })

router.patch('/:id/status/owner', authRequired, requireRole('OWNER','ADMIN'), async (req, res) => {
  const id = Number(req.params.id)
  const { status } = ownerStatusSchema.parse(req.body)

  const order = await prisma.order.findUnique({ where: { id }, include: { restaurant: true } })
  if (!order) return res.status(404).json({ error: 'Order not found' })

  const owns = order.restaurant.ownerId === req.user.id
  if (!(owns || req.user.role === 'ADMIN')) {
    return res.status(403).json({ error: 'Not your restaurant order' })
  }

  const allowed =
    (order.status === 'PENDING' && status === 'ACCEPTED') ||
    (order.status === 'ACCEPTED' && status === 'PREPARING')

  if (!allowed) {
    return res.status(400).json({ error: `Illegal transition ${order.status} -> ${status} for OWNER` })
  }

  const updated = await prisma.order.update({ where: { id }, data: { status } })
  try { req.app.get('io')?.to(`order:${id}`).emit('order:status', { id, status }) } catch {}
  res.json(updated)
})

/* ------------------------------------------------------------------ */
/* 5) COURIER transitions (PREPARING -> PICKED_UP -> DELIVERING)       */
/* ------------------------------------------------------------------ */
const courierStatusSchema = z.object({
  status: z.enum(['PICKED_UP','DELIVERING','CANCELED']),
})

router.patch('/:id/status/courier', authRequired, requireRole('COURIER','ADMIN'), async (req, res) => {
  const id = Number(req.params.id)
  const { status } = courierStatusSchema.parse(req.body)

  const order = await prisma.order.findUnique({ where: { id } })
  if (!order) return res.status(404).json({ error: 'Order not found' })

  // Seul le livreur assigné (ou admin) peut avancer le statut
  const allowedByAssign = (order.courierId === req.user.id) || req.user.role === 'ADMIN'
  if (!allowedByAssign) return res.status(403).json({ error: 'Not your assigned order' })

  const ok =
    (order.status === 'PREPARING' && status === 'PICKED_UP') ||
    (order.status === 'PICKED_UP' && status === 'DELIVERING') ||
    (status === 'CANCELED')

  if (!ok) return res.status(400).json({ error: `Illegal transition ${order.status} -> ${status} for COURIER` })

  const updated = await prisma.order.update({ where: { id }, data: { status } })

  try { req.app.get('io')?.to(`order:${id}`).emit('order:status', { id, status }) } catch {}
  res.json(updated)
})

/* ------------------------------------------------------------------ */
/* 6) CUSTOMER confirm delivered (DELIVERING -> DELIVERED)             */
/* ------------------------------------------------------------------ */
router.post('/:id/confirm-delivered', authRequired, requireRole('CUSTOMER','ADMIN'), async (req, res) => {
  const id = Number(req.params.id)
  const order = await prisma.order.findUnique({ where: { id } })
  if (!order) return res.status(404).json({ error: 'Order not found' })

  const isCustomer = order.customerId === req.user.id
  const isAdmin = req.user.role === 'ADMIN'
  if (!isCustomer && !isAdmin) return res.status(403).json({ error: 'Not your order' })

  if (order.status !== 'DELIVERING') {
    return res.status(400).json({ error: `Order must be DELIVERING to confirm. Current: ${order.status}` })
  }

  const updated = await prisma.order.update({ where: { id }, data: { status: 'DELIVERED' } })
  try { req.app.get('io')?.to(`order:${id}`).emit('order:status', { id, status: 'DELIVERED' }) } catch {}
  res.json(updated)
})

export default router
