import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import bcrypt from 'bcryptjs'
import multer from 'multer'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import { prisma, cookieOpts, requireAuth, requireAdmin, startSession, audit } from './lib'

export const api = Router()
const UPLOADS = path.resolve(process.cwd(), 'uploads')
const vis = z.enum(['PUBLIC', 'MEMBERS', 'PRIVATE'])
const slug = z.string().regex(/^[a-z0-9-]+$/).max(80)
const url = z.string().max(300).optional()
const page = (q: any) => { const take = Math.min(Number(q.limit) || 20, 100); return { take, skip: ((Number(q.page) || 1) - 1) * take } }
const DUMMY = bcrypt.hashSync('dummy-password', 12)
const rmFile = (u: string) => fs.unlink(path.join(UPLOADS, path.basename(u))).catch(() => {})
// Upload gambar (JPEG/PNG/WebP, maks 5 MB). Isi file dicek lewat magic bytes, bukan ekstensi.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } })
const sniff = (b: Buffer) => b.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) ? '.jpg' : b.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])) ? '.png'
  : b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP' ? '.webp' : null
const BAD_IMG = 'File harus gambar JPEG, PNG, atau WebP (maks 5 MB)'
async function saveImage(buf: Buffer) {
  const ext = sniff(buf); if (!ext) return null
  const name = crypto.randomUUID() + ext
  await fs.mkdir(UPLOADS, { recursive: true }); await fs.writeFile(path.join(UPLOADS, name), buf)
  return `/api/files/${name}`
}

// ---------- Auth ----------
const auth = Router()
auth.get('/csrf', (_req, res) => { const t = crypto.randomBytes(24).toString('hex'); res.cookie('csrf', t, cookieOpts); res.json({ csrfToken: t }) })
auth.post('/login', rateLimit({ windowMs: 15 * 60e3, limit: 10 }), async (req, res) => {
  const { username, password } = z.object({ username: z.string().max(60), password: z.string().max(100) }).parse(req.body)
  const u = await prisma.user.findUnique({ where: { username } })
  const ok = await bcrypt.compare(password, u?.passwordHash ?? DUMMY)
  if (!u || !u.isActive || !ok) return void res.status(401).json({ error: 'Username atau password salah' })
  await startSession(res, u.id)
  res.json({ user: { id: u.id, username: u.username, role: u.role } })
})
auth.post('/logout', async (req, res) => { if (req.sessionId) await prisma.session.delete({ where: { id: req.sessionId } }).catch(() => {}); res.clearCookie('sid', cookieOpts); res.sendStatus(204) })
auth.get('/me', requireAuth, (req, res) => res.json({ user: req.user }))
auth.post('/change-password', requireAuth, rateLimit({ windowMs: 15 * 60e3, limit: 10 }), async (req, res) => {
  const { currentPassword, newPassword } = z.object({ currentPassword: z.string().max(100), newPassword: z.string().min(10).max(100) }).parse(req.body)
  const u = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } })
  if (!(await bcrypt.compare(currentPassword, u.passwordHash))) return void res.status(400).json({ error: 'Password saat ini salah' })
  await prisma.user.update({ where: { id: u.id }, data: { passwordHash: await bcrypt.hash(newPassword, 12) } })
  await prisma.session.deleteMany({ where: { userId: u.id, NOT: { id: req.sessionId } } })
  res.sendStatus(204)
})
api.use('/auth', auth)

// ---------- Publik (mengikuti pengaturan visibilitas) ----------
const seen = (req: any) => ({ in: req.user ? ['PUBLIC', 'MEMBERS'] : ['PUBLIC'] }) as any
const pub = Router()
pub.get('/class-info', async (_q, res) => res.json({
  students: await prisma.studentProfile.count({ where: { profileVisibility: 'PUBLIC' } }),
  albums: await prisma.album.count({ where: { visibility: 'PUBLIC' } }),
  media: await prisma.media.count({ where: { visibility: 'PUBLIC' } }) }))
const pubStudent = { id: true, fullName: true, attendanceNumber: true, biography: true, photoUrl: true }
pub.get('/students', async (req, res) => res.json(await prisma.studentProfile.findMany({ where: { profileVisibility: seen(req) }, select: pubStudent, orderBy: { attendanceNumber: 'asc' }, ...page(req.query) })))
pub.get('/students/:id', async (req, res) => { const s = await prisma.studentProfile.findFirst({ where: { id: req.params.id, profileVisibility: seen(req) }, select: pubStudent }); s ? res.json(s) : res.sendStatus(404) })
pub.get('/teachers', async (_q, res) => res.json(await prisma.teacher.findMany({ orderBy: { name: 'asc' } })))
pub.get('/albums', async (req, res) => res.json(await prisma.album.findMany({ where: { visibility: seen(req) }, include: { category: true }, orderBy: { eventDate: 'desc' }, ...page(req.query) })))
pub.get('/albums/:slug', async (req, res) => {
  const a = await prisma.album.findFirst({ where: { slug: req.params.slug, visibility: seen(req) }, include: { category: true, media: { where: { visibility: seen(req) }, orderBy: { sortOrder: 'asc' } } } })
  a ? res.json(a) : res.sendStatus(404)
})
pub.get('/media', async (req, res) => res.json(await prisma.media.findMany({ where: { visibility: seen(req), album: { visibility: seen(req) } }, include: { album: { include: { category: true } } }, orderBy: { createdAt: 'desc' }, ...page(req.query) })))
pub.get('/stories', async (_q, res) => res.json(await prisma.classStory.findMany({ where: { status: 'PUBLISHED' }, orderBy: { publishedAt: 'desc' } })))
pub.get('/messages', async (_q, res) => res.json(await prisma.memoryMessage.findMany({ where: { status: 'PUBLISHED' }, select: { id: true, content: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 50 })))
api.use('/public', pub)

// File foto: hanya diberikan jika visibilitas mengizinkan (tidak ada folder publik).
api.get('/files/:name', async (req, res) => {
  const name = path.basename(req.params.name)
  const u = `/api/files/${name}`
  const m = await prisma.media.findUnique({ where: { mediaUrl: u } })
  let ok = !!m && (m.visibility === 'PUBLIC' || (m.visibility === 'MEMBERS' && !!req.user) || req.user?.role === 'ADMIN')
  if (!m) { // foto guru: publik. Foto siswa: mengikuti visibilitas profilnya.
    if (await prisma.teacher.findFirst({ where: { photoUrl: u }, select: { id: true } })) ok = true
    else { const sp = await prisma.studentProfile.findFirst({ where: { photoUrl: u } }); ok = !!sp && (sp.profileVisibility === 'PUBLIC' || (sp.profileVisibility === 'MEMBERS' && !!req.user) || req.user?.role === 'ADMIN' || req.user?.id === sp.userId) }
  }
  ok ? res.sendFile(path.join(UPLOADS, name)) : res.sendStatus(404)
})

// ---------- Siswa ----------
const student = Router(); student.use(requireAuth)
student.get('/profile', async (req, res) => { const p = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } }); p ? res.json(p) : res.sendStatus(404) })
student.patch('/profile', async (req, res) => { // hanya profil milik sendiri (userId dari sesi)
  const data = z.object({ biography: z.string().max(500).optional(), profileVisibility: vis.optional() }).parse(req.body)
  res.json(await prisma.studentProfile.update({ where: { userId: req.user!.id }, data }))
})
student.post('/profile/photo', rateLimit({ windowMs: 60e3, limit: 10 }), upload.single('file'), async (req, res) => {
  const url = req.file ? await saveImage(req.file.buffer) : null
  if (!url) return void res.status(400).json({ error: BAD_IMG })
  const old = await prisma.studentProfile.findUnique({ where: { userId: req.user!.id } }) // hanya profil milik sendiri
  if (!old) { await rmFile(url); return void res.sendStatus(404) }
  const p = await prisma.studentProfile.update({ where: { userId: req.user!.id }, data: { photoUrl: url } })
  if (old.photoUrl) await rmFile(old.photoUrl)
  res.json(p)
})
student.post('/memory-messages', rateLimit({ windowMs: 60e3, limit: 5 }), async (req, res) => {
  const { content } = z.object({ content: z.string().min(3).max(1000) }).parse(req.body)
  res.status(201).json(await prisma.memoryMessage.create({ data: { content, authorId: req.user!.id, status: 'PENDING' } }))
})
api.use('/student', student)

// ---------- Admin ----------
const admin = Router(); admin.use(requireAdmin)
function crud(name: string, model: string, schema: z.ZodObject<any>, o: { owner?: string; noCreate?: boolean } = {}) {
  const m = () => (prisma as any)[model]
  admin.get(`/${name}`, async (req, res) => { const [items, total] = await Promise.all([m().findMany({ ...page(req.query), orderBy: { createdAt: 'desc' } }), m().count()]); res.json({ items, total }) })
  admin.get(`/${name}/:id`, async (req, res) => { const x = await m().findUnique({ where: { id: req.params.id } }); x ? res.json(x) : res.sendStatus(404) })
  if (!o.noCreate) admin.post(`/${name}`, async (req, res) => {
    const x = await m().create({ data: { ...schema.parse(req.body), ...(o.owner ? { [o.owner]: req.user!.id } : {}) } })
    await audit(req, 'create', model, x.id); res.status(201).json(x)
  })
  admin.patch(`/${name}/:id`, async (req, res) => { const x = await m().update({ where: { id: req.params.id }, data: schema.partial().parse(req.body) }); await audit(req, 'update', model, x.id); res.json(x) })
  admin.delete(`/${name}/:id`, async (req, res) => {
    const files = model === 'album' ? await prisma.media.findMany({ where: { albumId: req.params.id }, select: { mediaUrl: true } }) : []
    await m().delete({ where: { id: req.params.id } })
    await Promise.all(files.map(f => rmFile(f.mediaUrl))); await audit(req, 'delete', model, req.params.id); res.sendStatus(204)
  })
}
crud('teachers', 'teacher', z.object({ name: z.string().min(1).max(100), subject: z.string().min(1).max(100), description: z.string().max(500).optional(), photoUrl: url }))
crud('categories', 'galleryCategory', z.object({ name: z.string().min(1).max(60), slug, description: z.string().max(300).optional() }))
crud('albums', 'album', z.object({ title: z.string().min(1).max(120), slug, description: z.string().max(1000).optional(), categoryId: z.string(), visibility: vis, eventDate: z.coerce.date().optional(), coverImageUrl: url }), { owner: 'createdById' })
crud('stories', 'classStory', z.object({ title: z.string().min(1).max(150), slug, content: z.string().min(1).max(20000), status: z.enum(['DRAFT', 'PUBLISHED']), publishedAt: z.coerce.date().optional(), coverImageUrl: url }), { owner: 'authorId' })
crud('memory-messages', 'memoryMessage', z.object({ status: z.enum(['PENDING', 'PUBLISHED', 'REJECTED']) }), { noCreate: true })

// Siswa: membuat akun + profil sekaligus. Password awal diisi admin, tidak ada default di kode.
const stuSchema = z.object({ fullName: z.string().min(1).max(100), attendanceNumber: z.number().int().min(1).max(99), biography: z.string().max(500).optional(), photoUrl: url, profileVisibility: vis.optional() })
admin.get('/students', async (req, res) => res.json(await prisma.studentProfile.findMany({ include: { user: { select: { username: true, isActive: true } } }, orderBy: { attendanceNumber: 'asc' }, ...page(req.query) })))
admin.post('/students', async (req, res) => {
  const d = stuSchema.extend({ username: z.string().regex(/^[a-zA-Z0-9_.-]{3,40}$/), password: z.string().min(10).max(100) }).parse(req.body)
  const { username, password, ...profile } = d
  const u = await prisma.user.create({ data: { username, passwordHash: await bcrypt.hash(password, 12), role: 'STUDENT', profile: { create: profile } }, include: { profile: true } })
  await audit(req, 'create', 'student', u.id); res.status(201).json(u.profile)
})
admin.patch('/students/:id', async (req, res) => { const x = await prisma.studentProfile.update({ where: { id: req.params.id }, data: stuSchema.partial().parse(req.body) }); await audit(req, 'update', 'student', x.id); res.json(x) })
admin.delete('/students/:id', async (req, res) => { const p = await prisma.studentProfile.findUniqueOrThrow({ where: { id: req.params.id } }); await prisma.user.delete({ where: { id: p.userId } }); await audit(req, 'delete', 'student', p.id); res.sendStatus(204) })

// Foto guru dan foto siswa (oleh admin)
for (const [name, model] of [['teachers', 'teacher'], ['students', 'studentProfile']] as const)
  admin.post(`/${name}/:id/photo`, upload.single('file'), async (req, res) => {
    const url = req.file ? await saveImage(req.file.buffer) : null
    if (!url) return void res.status(400).json({ error: BAD_IMG })
    const m = (prisma as any)[model]
    const old = await m.findUnique({ where: { id: req.params.id } })
    if (!old) { await rmFile(url); return void res.sendStatus(404) }
    const x = await m.update({ where: { id: req.params.id }, data: { photoUrl: url } })
    if (old.photoUrl) await rmFile(old.photoUrl)
    await audit(req, 'photo', model, x.id); res.json(x)
  })

// Media: upload foto (JPEG/PNG/WebP, maks 5 MB), isi file dicek lewat magic bytes.
admin.post('/media', upload.single('file'), async (req, res) => {
  const d = z.object({ albumId: z.string(), title: z.string().min(1).max(120), description: z.string().max(500).optional(), visibility: vis.default('PRIVATE') }).parse(req.body)
  const ext = req.file ? sniff(req.file.buffer) : null
  if (!req.file || !ext) return void res.status(400).json({ error: 'File harus gambar JPEG, PNG, atau WebP (maks 5 MB)' })
  const name = crypto.randomUUID() + ext
  await fs.mkdir(UPLOADS, { recursive: true }); await fs.writeFile(path.join(UPLOADS, name), req.file.buffer)
  try {
    const m = await prisma.media.create({ data: { ...d, mediaUrl: `/api/files/${name}`, uploadedById: req.user!.id } })
    await audit(req, 'upload', 'media', m.id); res.status(201).json(m)
  } catch (e) { await rmFile(name); throw e } // jangan sisakan file yatim jika DB gagal
})
admin.get('/media', async (req, res) => res.json(await prisma.media.findMany({ where: req.query.albumId ? { albumId: String(req.query.albumId) } : {}, orderBy: [{ albumId: 'asc' }, { sortOrder: 'asc' }], ...page(req.query) })))
admin.patch('/media/:id', async (req, res) => {
  const data = z.object({ title: z.string().max(120), description: z.string().max(500), visibility: vis, sortOrder: z.number().int() }).partial().parse(req.body)
  const m = await prisma.media.update({ where: { id: req.params.id }, data }); await audit(req, 'update', 'media', m.id); res.json(m)
})
admin.delete('/media/:id', async (req, res) => { const m = await prisma.media.delete({ where: { id: req.params.id } }); await rmFile(m.mediaUrl); await audit(req, 'delete', 'media', m.id); res.sendStatus(204) })

// Pengguna & audit
admin.get('/users', async (req, res) => res.json(await prisma.user.findMany({ select: { id: true, username: true, email: true, role: true, isActive: true, createdAt: true }, ...page(req.query) })))
admin.patch('/users/:id', async (req, res) => {
  const d = z.object({ role: z.enum(['STUDENT', 'ADMIN']).optional(), isActive: z.boolean().optional() }).parse(req.body)
  if (req.params.id === req.user!.id) return void res.status(400).json({ error: 'Tidak bisa mengubah akun sendiri' })
  const u = await prisma.user.update({ where: { id: req.params.id }, data: d, select: { id: true, role: true, isActive: true } })
  if (d.isActive === false) await prisma.session.deleteMany({ where: { userId: u.id } })
  await audit(req, 'update', 'user', u.id); res.json(u)
})
admin.post('/users/:id/reset-password', async (req, res) => {
  const { password } = z.object({ password: z.string().min(10).max(100) }).parse(req.body)
  await prisma.user.update({ where: { id: req.params.id }, data: { passwordHash: await bcrypt.hash(password, 12) } })
  await prisma.session.deleteMany({ where: { userId: req.params.id } }); await audit(req, 'reset-password', 'user', req.params.id); res.sendStatus(204)
})
admin.get('/audit-logs', async (req, res) => res.json(await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, ...page(req.query) })))
api.use('/admin', admin)
