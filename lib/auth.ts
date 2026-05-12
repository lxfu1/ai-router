import crypto from 'crypto'

const JWT_SECRET = process.env.JWT_SECRET || 'ai-router-secret-2024'

export function generateToken(payload: object): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${signature}`
}

export function verifyToken(token: string): object | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${parts[0]}.${parts[1]}`).digest('base64url')
    if (signature !== parts[2]) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
    if (payload.exp && payload.exp < Date.now() / 1000) return null
    return payload
  } catch {
    return null
  }
}

export function checkAdminAuth(request: Request): boolean {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return false
  const payload = verifyToken(auth.slice(7))
  return payload !== null && (payload as { role: string }).role === 'admin'
}