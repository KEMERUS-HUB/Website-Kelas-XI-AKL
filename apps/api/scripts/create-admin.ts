// Membuat/memperbarui akun admin. Password dibaca saat dijalankan, tidak ditulis di kode.
import 'dotenv/config'
import readline from 'node:readline/promises'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const username = process.env.ADMIN_USERNAME || (await rl.question('Username admin: ')).trim()
  const password = process.env.ADMIN_PASSWORD || (await rl.question('Password admin (min 10 karakter): '))
  rl.close()
  if (!/^[a-zA-Z0-9_.-]{3,40}$/.test(username) || password.length < 10) throw new Error('Username 3-40 karakter, password min 10 karakter')
  const passwordHash = await bcrypt.hash(password, 12)
  await prisma.user.upsert({ where: { username }, update: { passwordHash, role: 'ADMIN', isActive: true }, create: { username, passwordHash, role: 'ADMIN' } })
  console.log('Admin siap:', username)
}
main().catch(e => { console.error(e.message); process.exit(1) }).finally(() => prisma.$disconnect())
