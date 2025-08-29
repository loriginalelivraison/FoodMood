// src/routes/admin.js
import { Router } from "express"
import { authRequired, requireRole } from "../middleware/auth.js"
import prisma from "../lib/prisma.js"

const router = Router()

// middleware admin only
router.use(authRequired, requireRole("ADMIN"))

/* 1) Utilisateurs */
router.get("/utilisateurs", async (_req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true, name: true, phone: true, role: true, createdAt: true, updatedAt: true
    }
  })
  res.json(users)
})

/* 2) Restaurants */
router.get("/restaurants", async (_req, res) => {
  const restos = await prisma.restaurant.findMany({
    include: {
      owner: { select: { id: true, name: true, phone: true } },
      _count: { select: { orders: true, menu: true } }
    }
  })
  res.json(restos)
})

/* 3) Livreurs */
router.get("/livreurs", async (_req, res) => {
  const livreurs = await prisma.user.findMany({
    where: { role: "COURIER" },
    include: {
      courierPos: true,
      courierOrders: { select: { id: true, status: true, totalCents: true } }
    }
  })
  res.json(livreurs)
})

/* 4) Commandes */
router.get("/commandes", async (_req, res) => {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      restaurant: { select: { id: true, name: true } },
      courier: { select: { id: true, name: true } },
      items: { include: { menuItem: true } }
    }
  })
  res.json(orders)
})

/* 5) Finances */
router.get("/finances", async (_req, res) => {
  const orders = await prisma.order.findMany({
    where: { status: { in: ["DELIVERED", "ARCHIVED"] } },
    include: { restaurant: true, courier: true }
  })

  const commissionRate = 0.1
  let total = 0, adminRevenue = 0
  const perRestaurant = {}, perCourier = {}

  for (const o of orders) {
    total += o.totalCents
    const commission = Math.floor(o.totalCents * commissionRate)
    adminRevenue += commission

    // Resto
    if (o.restaurantId) {
      perRestaurant[o.restaurantId] = (perRestaurant[o.restaurantId] || 0) + (o.totalCents - commission)
    }

    // Livreur
    if (o.courierId) {
      perCourier[o.courierId] = (perCourier[o.courierId] || 0) + 299 // frais livraison fixe ex.
    }
  }

  res.json({ total, adminRevenue, perRestaurant, perCourier })
})

/* 6) Statistiques */
router.get("/statistiques", async (_req, res) => {
  const byDay = await prisma.$queryRaw`
    SELECT DATE("createdAt") as day, COUNT(*)::int as count
    FROM "Order"
    GROUP BY day
    ORDER BY day DESC
    LIMIT 7
  `
  res.json({ byDay })
})

export default router
