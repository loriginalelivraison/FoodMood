import { Router } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { authRequired, requireRole } from '../middleware/auth.js'

const router = Router()

// Commandes disponibles pour prise (coursiers)
router.get('/available-orders', authRequired, requireRole('COURIER','ADMIN'), async (_req, res) => {
  const orders = await prisma.order.findMany({
    where: { courierId: null, status: { in: ['ACCEPTED','PREPARING'] } },
    orderBy: { createdAt: 'asc' },
    include: {
      restaurant: { select: { id: true, name: true, lat: true, lng: true, address: true } },
      items: { include: { menuItem: true } },
      customer: { select: { id: true, name: true, phone: true } },
      courier: { select: { id: true, name: true, phone: true } },
    },
  })
  res.json(orders)
})

// Mes courses en cours
router.get('/my-orders', authRequired, requireRole('COURIER','ADMIN'), async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { courierId: req.user.id, status: { in: ['ACCEPTED','PREPARING','PICKED_UP','DELIVERING'] } },
    orderBy: { createdAt: 'desc' },
    include: {
      restaurant: { select: { id: true, name: true, lat: true, lng: true, address: true } },
      items: { include: { menuItem: true } },
      customer: { select: { id: true, name: true, phone: true } },
      courier: { select: { id: true, name: true, phone: true } },
    },
  })
  res.json(orders)
})

// Prendre une commande
router.post('/claim/:orderId', authRequired, requireRole('COURIER','ADMIN'), async (req, res) => {
  const orderId = Number(req.params.orderId)
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) return res.status(404).json({ error: 'Order not found' })
  if (order.courierId) return res.status(400).json({ error: 'Order already assigned' })
  if (!['ACCEPTED','PREPARING'].includes(order.status)) return res.status(400).json({ error: 'Order not available for pickup' })

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { courierId: req.user.id },
    include: {
      restaurant: true,
      customer: true,
      items: { include: { menuItem: true } },
      courier: { select: { id: true, name: true, phone: true } },
    }
  })

  // Émettre l’event enrichi vers la room de la commande
  try {
    req.app.get('io')?.to(`order:${orderId}`).emit('order:claimed', {
      orderId,
      courier: updated.courier || { id: req.user.id }
    })
  } catch {}

  res.json(updated)
})

const courierStatusSchema = z.object({ status: z.enum(['PICKED_UP','DELIVERING','CANCELED']) })

// Transitions côté coursier
router.patch('/orders/:orderId/status', authRequired, requireRole('COURIER','ADMIN'), async (req, res) => {
  const orderId = Number(req.params.orderId)
  const { status } = courierStatusSchema.parse(req.body)
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) return res.status(404).json({ error: 'Order not found' })
  const allowedByAssign = (order.courierId === req.user.id) || req.user.role === 'ADMIN'
  if (!allowedByAssign) return res.status(403).json({ error: 'Not your assigned order' })

  const ok =
    (order.status === 'PREPARING' && status === 'PICKED_UP') ||
    (order.status === 'PICKED_UP' && status === 'DELIVERING') ||
    (status === 'CANCELED')

  if (!ok) return res.status(400).json({ error: `Illegal transition ${order.status} -> ${status} for COURIER` })

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status },
    include: {
      courier: { select: { id: true, name: true, phone: true } }
    }
  })

  try { req.app.get('io')?.to(`order:${orderId}`).emit('order:status', { id: orderId, status }) } catch {}
  res.json(updated)
})

const posSchema = z.object({ lat: z.number(), lng: z.number() })

// Partage de position du coursier (live)
router.post('/position', authRequired, requireRole('COURIER','ADMIN'), async (req, res) => {
  const { lat, lng } = posSchema.parse(req.body)
  const up = await prisma.courierPosition.upsert({
    where: { courierId: req.user.id },
    update: { lat, lng },
    create: { courierId: req.user.id, lat, lng },
  })
  try { req.app.get('io')?.emit('courier:position', { courierId: req.user.id, lat, lng, updatedAt: new Date().toISOString() }) } catch {}
  res.json(up)
})

export default router
