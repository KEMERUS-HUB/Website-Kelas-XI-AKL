// SEMUA DATA DI SINI ADALAH DEMO/PLACEHOLDER. Foto asli diunggah lewat admin setelah backend jadi.
export const cats = ['Foto Bersama','Kegiatan Kelas','Acara Sekolah','Study Tour','Perayaan','Momen Random','Kenangan Favorit']
export const students = Array.from({ length: 14 }, (_, i) => ({
  id: i + 1, no: i + 1, name: `Siswa Demo ${String(i + 1).padStart(2, '0')}`,
  bio: 'Deskripsi pribadi belum diisi. Siswa memilih sendiri apa yang dibagikan. [DEMO]',
}))
export const photos = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1, title: `Kenangan Demo ${i + 1}`, cat: cats[i % cats.length],
  date: `2026-${String((i % 9) + 1).padStart(2, '0')}-10`,
  desc: 'Placeholder. Ganti dengan foto dan cerita asli kelas. [DEMO]',
  ratio: ['aspect-[4/5]', 'aspect-square', 'aspect-[4/3]'][i % 3],
}))
export const stories = [
  { date: '2025-07-14', title: 'Hari pertama di kelas X AKL [DEMO]', text: 'Tempat kisah ini ditulis admin. Isi dengan momen sebenarnya.' },
  { date: '2026-01-20', title: 'Naik ke kelas XI [DEMO]', text: 'Teman sekelas bertambah dekat. Placeholder cerita.' },
  { date: '2026-03-05', title: 'Kegiatan besar pertama [DEMO]', text: 'Placeholder untuk kegiatan kelas yang tak terlupakan.' },
]
export const fmt = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
export const teachers = [
  ['Akuntansi Keuangan Lembaga'],['Administrasi Pajak'],['Komputer Akuntansi'],['Bahasa Indonesia'],['Matematika'],['Bahasa Inggris'],
].map(([subject], i) => ({ id: i + 1, name: `Guru Demo ${i + 1}`, subject,
  desc: 'Deskripsi singkat guru belum diisi: gaya mengajar, pengalaman, atau pesan untuk siswa. [DEMO]' }))
