import express, { NextFunction, Request, Response } from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import multer from 'multer'
import { ZodError } from 'zod'
import { env, loadUser, csrf } from './lib'
import { api } from './routes'

export const app = express()
app.set('trust proxy', 1)
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors({ origin: env.origin, credentials: true }))
app.use(express.json({ limit: '100kb' }), cookieParser())
app.use('/api', rateLimit({ windowMs: 60e3, limit: 300 }), loadUser, csrf, api)
app.get('/health', (_q, res) => res.json({ ok: true }))

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) return void res.status(400).json({ error: 'Input tidak valid', details: err.flatten().fieldErrors })
  if (err instanceof multer.MulterError) return void res.status(400).json({ error: 'Upload ditolak: ' + err.message })
  if (err?.code === 'P2002') return void res.status(409).json({ error: 'Data sudah ada (duplikat)' })
  if (err?.code === 'P2003') return void res.status(409).json({ error: 'Data masih dipakai oleh data lain' })
  if (err?.code === 'P2025') return void res.sendStatus(404)
  console.error(err)
  res.status(500).json({ error: 'Terjadi kesalahan pada server' })
})
