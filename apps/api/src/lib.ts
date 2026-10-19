import 'dotenv/config'
import crypto from 'node:crypto'
import { PrismaClient, Role } from '@prisma/client'
import type { NextFunction, Request, Response } from 'express'

export const prisma = new PrismaClient()
export const env = { port: Number(process.env.PORT || 4000), origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', prod: process.env.NODE_ENV === 'production' }
declare global { namespace Express { interface Request { user?: { id: string; role: Role; username: string }; sessionId?: string } } }

const sha = (t: string) => crypto.createHash('sha256').update(t).digest('hex')
const DAY = 864e5
// Lintas domain (Netlify -> API) di produksi butuh SameSite=None + Secure.
export const cookieOpts = { httpOnly: true, secure: env.prod, sameSite: (env.prod ? 'none' : 'lax') as 'none' | 'lax', maxAge: 7 * DAY, path: '/' }

export async function startSession(res: Response, userId: string) {
  const token = crypto.randomBytes(32).toString('hex')
  await prisma.session.create({ data: { tokenHash: sha(token), userId, expiresAt: new Date(Date.now() + 7 * DAY) } })
  res.cookie('sid', token, cookieOpts)
}
export async function loadUser(req: Request, _res: Response, next: NextFunction) {
  const t = req.cookies?.sid
  if (typeof t === 'string') {
    const s = await prisma.session.findUnique({ where: { tokenHash: sha(t) }, include: { user: true } })
    if (s && s.expiresAt > new Date() && s.user.isActive) { req.user = { id: s.user.id, role: s.user.role, username: s.user.username }; req.sessionId = s.id }
  }
  next()
}
export const requireAuth = (req: Request, res: Response, next: NextFunction) => (req.user ? next() : void res.status(401).json({ error: 'Harus login' }))
export const requireAdmin = (req: Request, res: Response, next: NextFunction) =>
  !req.user ? void res.status(401).json({ error: 'Harus login' }) : req.user.role !== 'ADMIN' ? void res.status(403).json({ error: 'Khusus admin' }) : next()

// CSRF: cek Origin + token (dari /api/auth/csrf) harus sama dengan cookie 'csrf'.
export function csrf(req: Request, res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
  const origin = req.headers.origin
  if ((origin && origin !== env.origin) || (!origin && env.prod)) return void res.status(403).json({ error: 'Origin ditolak' })
  const c = req.cookies?.csrf, h = req.headers['x-csrf-token']
  if (!c || c !== h) return void res.status(403).json({ error: 'Token CSRF tidak valid' })
  next()
}
export const audit = (req: Request, action: string, entityType: string, entityId?: string) =>
  prisma.auditLog.create({ data: { actorUserId: req.user?.id, action, entityType, entityId } })
