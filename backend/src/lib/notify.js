import prisma from './prisma.js'

/**
 * Crée une notification + push via Socket.IO dans la room "user:{userId}"
 * @param {object} io - socket.io serveur (app.get('io'))
 * @param {number} userId
 * @param {{type:string,title:string,message:string,orderId?:number}} payload
 * @returns {Promise<object>} notification créée
 */
export async function notify(io, userId, payload) {
  const n = await prisma.notification.create({
    data: {
      userId,
      type: payload.type || 'INFO',
      title: payload.title || '',
      message: payload.message || '',
      orderId: payload.orderId ?? null,
    },
  })
  try {
    io?.to(`user:${userId}`).emit('notify', {
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      orderId: n.orderId,
      createdAt: n.createdAt,
    })
  } catch (e) {}
  return n
}
