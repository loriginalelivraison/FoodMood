import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authRequired } from '../middleware/auth.js'

const router = Router()

// Liste (non lues d’abord) + pagination simple
router.get('/', authRequired, async (req, res) => {
  const list = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: [{ read: 'asc' }, { createdAt: 'desc' }],
    take: 50,
  })
  res.json(list)
})

// Tout (utile pour historique)
router.get('/all', authRequired, async (req, res) => {
  const list = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  res.json(list)
})

// Marquer lue
router.post('/:id/read', authRequired, async (req, res) => {
  const id = Number(req.params.id)
  const n = await prisma.notification.findUnique({ where: { id } })
  if (!n || n.userId !== req.user.id) return res.status(404).json({ error: 'Not found' })
  const up = await prisma.notification.update({ where: { id }, data: { read: true } })
  res.json(up)
})

// Tout lu
router.post('/read-all', authRequired, async (req, res) => {
  await prisma.notification.updateMany({ where: { userId: req.user.id, read: false }, data: { read: true } })
  res.json({ ok: true })
})

export default router
