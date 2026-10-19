// Aman dijalankan berulang: memakai upsert. Hanya mengisi kategori galeri (tanpa akun/password).
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const cats = ['Foto Bersama', 'Kegiatan Kelas', 'Acara Sekolah', 'Study Tour', 'Perayaan', 'Momen Random', 'Kenangan Favorit']
async function main() {
  for (const name of cats) {
    const slug = name.toLowerCase().replace(/\s+/g, '-')
    await prisma.galleryCategory.upsert({ where: { slug }, update: {}, create: { name, slug } })
  }
  console.log('Seed selesai:', cats.length, 'kategori')
}
main().finally(() => prisma.$disconnect())
