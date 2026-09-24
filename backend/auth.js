import { createHmac, timingSafeEqual } from 'node:crypto'

const JWT_SECRET = process.env.JWT_SECRET || 'rsms-evaluation-demo-secret-change-me'
const b64url = (value) => Buffer.from(value).toString('base64url')

export function signToken(user) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const now = Math.floor(Date.now() / 1000)
  const payload = b64url(JSON.stringify({
    sub: user.id,
    email: user.email,
    role: user.role,
    rollNumber: user.student_roll_number,
    iat: now,
    exp: now + 60 * 60 * 4,
  }))
  const signature = createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url')
  return `${header}.${payload}.${signature}`
}

function verifyToken(token) {
  const [header, payload, signature] = String(token).split('.')
  if (!header || !payload || !signature) throw new Error('Malformed token')
  const expected = createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url')
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error('Bad signature')
  const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) throw new Error('Expired token')
  return data
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Authentication required' })
  try {
    req.user = verifyToken(token)
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: 'This action requires faculty access' })
    next()
  }
}
