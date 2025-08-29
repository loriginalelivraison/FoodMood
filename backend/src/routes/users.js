import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authRequired } from '../middleware/auth.js'

const router = Router()

router.get('/me', authRequired, async (req, res) => {
  const me = await prisma.user.findUnique({ where: { id: req.user.id },
    select: { id: true, phone: true, name: true, role: true }
  })
  res.json(me)
})

export default router
