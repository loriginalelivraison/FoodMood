import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me'

export function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, phone: user.phone, name: user.name || null },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

export function authRequired(req, res, next) {
  try {
    const hdr = req.headers.authorization || ''
    const [, token] = hdr.split(' ')
    if (!token) return res.status(401).json({ error: 'No token' })
    const payload = jwt.verify(token, JWT_SECRET)
    req.user = { id: payload.id, role: payload.role, phone: payload.phone, name: payload.name }
    next()
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' })
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' })
    next()
  }
}
