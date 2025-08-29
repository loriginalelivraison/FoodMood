import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import http from 'http'
import { Server as SocketIOServer } from 'socket.io'
import prisma from './src/lib/prisma.js'

import authRoutes from './src/routes/auth.js'
import userRoutes from './src/routes/users.js'
import restaurantRoutes from './src/routes/restaurants.js'
import orderRoutes from './src/routes/orders.js'
import quoteRoutes from './src/routes/quotes.js'
import courierRoutes from './src/routes/couriers.js'
import uploadRoutes from './src/routes/uploads.js'
import cartRoutes from './src/routes/cart.js'

import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 8080

// ✅ CORS : accepte une liste séparée par des virgules, ou tout s’il est vide
const rawOrigins = (process.env.CORS_ORIGIN || '').trim()
const origins = rawOrigins
  ? rawOrigins.split(',').map(s => s.trim())
  : true // accepte tout en fallback (utile sur Heroku si tu n'as pas encore mis la variable)

app.use(cors({
  origin: origins,
  credentials: true,
}))

// ⬆️ Limites un peu plus grandes (utile si tu envoies des dataURL côté front pour autre chose)
app.use(express.json({ limit: '15mb' }))
app.use(express.urlencoded({ extended: true, limit: '15mb' }))
app.use(cookieParser())

// Health
app.get('/api/health', (_req, res) => res.json({ ok: true }))

// API
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/restaurants', restaurantRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/quotes', quoteRoutes)
app.use('/api/couriers', courierRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/cart', cartRoutes)

// Socket.IO
const server = http.createServer(app)
const io = new SocketIOServer(server, {
  cors: { origin: origins, credentials: true }
})
app.set('io', io)
io.on('connection', socket => {
  socket.on('join', room => socket.join(room))
})

// 🔔 Helper de notif ciblée (déjà utilisé par le reste)
app.set('notify', (targets, payload) => {
  try {
    for (const uid of (targets || [])) {
      io.to(`user:${uid}`).emit('notify', payload)
    }
  } catch (e) { console.error('notify error:', e?.message || e) }
})

// Auto archive DELIVERED -> ARCHIVED après 15 min
const ARCHIVE_AFTER_MINUTES = 15
setInterval(async () => {
  try {
    const cutoff = new Date(Date.now() - ARCHIVE_AFTER_MINUTES * 60 * 1000)
    await prisma.order.updateMany({
      where: { status: 'DELIVERED', updatedAt: { lte: cutoff } },
      data: { status: 'ARCHIVED' }
    })
  } catch (e) { console.error('Auto-archive error:', e?.message || e) }
}, 60 * 1000)

// Static React (build)
app.use(express.static(path.join(__dirname, "../frontend/dist")))
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dist/index.html"))
})

server.listen(PORT, () => console.log(`🚀 API running on http://localhost:${PORT}`))
