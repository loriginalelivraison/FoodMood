import { Router } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma.js'
import { authRequired, signToken } from '../middleware/auth.js'

const router = Router()

// Zod schemas
const registerSchema = z.object({
  phone: z.string().min(6),
  password: z.string().min(4),
  name: z.string().optional().nullable(),
  // Rôles autorisés à la création publique
  role: z.enum(['CUSTOMER','OWNER','COURIER','ADMIN']).optional().default('CUSTOMER'),
})

const loginSchema = z.object({
  phone: z.string().min(6),
  password: z.string().min(4),
})

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body)

    const exist = await prisma.user.findUnique({ where: { phone: data.phone } })
    if (exist) return res.status(409).json({ error: 'Phone already used' })

    const passwordHash = await bcrypt.hash(data.password, 10)

    const user = await prisma.user.create({
      data: {
        phone: data.phone,
        passwordHash,
        name: data.name || null,
        role: data.role, // <= IMPORTANT: on enregistre le rôle choisi
      },
      select: { id: true, phone: true, name: true, role: true },
    })

    const token = signToken(user)
    return res.json({ token, user })
  } catch (e) {
    return res.status(400).json({ error: e.message })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = loginSchema.parse(req.body)
    const user = await prisma.user.findUnique({ where: { phone }, select: { id: true, phone: true, name: true, role: true, passwordHash: true } })
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })
    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' })

    const { passwordHash, ...publicUser } = user
    const token = signToken(publicUser)
    return res.json({ token, user: publicUser })
  } catch (e) {
    return res.status(400).json({ error: e.message })
  }
})

// GET /api/auth/me
router.get('/me', authRequired, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, phone: true, name: true, role: true },
  })
  if (!user) return res.status(404).json({ error: 'Not found' })
  res.json(user)
})

// POST /api/auth/logout (optionnel si tu gardes le token en localStorage)
router.post('/logout', (_req, res) => {
  res.json({ ok: true })
})

export default router
