import { FormEvent, ReactNode, createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { BrowserRouter, Routes, Route, Link, NavLink, Navigate, useLocation, useNavigate, useOutlet, useParams } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Menu, X, Search, ChevronLeft, ChevronRight, Leaf, Camera, UserRound } from 'lucide-react'
import { fmt } from './data'
import { api, asset, useApi } from './api'

const tones = ['from-green-200 to-emerald-300', 'from-emerald-100 to-green-300', 'from-lime-100 to-green-200', 'from-teal-100 to-emerald-200']
const hash = (i: number | string) => (typeof i === 'string' ? [...i].reduce((s, c) => s + c.charCodeAt(0), 0) : i)
const Ph = ({ i, cls = '', children }: { i: number | string; cls?: string; children?: ReactNode }) => (
  <div role="img" aria-label="Foto placeholder" className={`bg-gradient-to-br ${tones[hash(i) % 4]} flex flex-col items-center justify-center gap-2 text-forest/60 ${cls}`}>{children ?? <Camera />}</div>
)
// Muncul saat masuk layar, dan memudar ke atas/bawah saat keluar layar (dua arah).
function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null); const calm = useReducedMotion()
  const [s, setS] = useState<'in' | 'above' | 'below'>('below')
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setS(e.isIntersecting ? 'in' : e.boundingClientRect.top < 0 ? 'above' : 'below'), { threshold: 0.12 })
    io.observe(ref.current!); return () => io.disconnect()
  }, [])
  const on = calm || s === 'in'
  return <motion.div ref={ref} className={className} animate={on ? { opacity: 1, y: 0 } : { opacity: 0, y: s === 'above' ? -40 : 40 }}
    transition={{ duration: .6, ease: 'easeOut', delay: on ? delay : 0 }}>{children}</motion.div>
}
const H1 = ({ children }: { children: ReactNode }) => <Reveal><h1 className="text-3xl md:text-4xl font-extrabold mb-6">{children}</h1></Reveal>
const nav = [['/', 'Beranda'], ['/siswa', 'Profil Siswa'], ['/guru', 'Guru'], ['/galeri', 'Galeri Kenangan'], ['/cerita', 'Cerita Kelas']]

function Layout() {
  const [open, setOpen] = useState(false); const { pathname } = useLocation(); const outlet = useOutlet(); const { user } = useAuth()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  const link = ({ isActive }: { isActive: boolean }) => `glass-pill${isActive ? ' is-active' : ''}`
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-edge">
        <div className="mx-auto max-w-6xl flex items-center justify-between p-4">
          <Link to="/" className="flex items-center gap-2 font-extrabold"><img src="/logo.png" alt="Logo Yayasan Darul Ma'arif" className="h-9 w-9 object-contain" />XI AKL</Link>
          <nav className="hidden md:flex items-center gap-2" aria-label="Utama">
            {nav.map(([to, l]) => <NavLink key={to} end={to === '/'} to={to} className={link}>{l}</NavLink>)}
            <Link to={user ? (user.role === 'ADMIN' ? '/admin' : '/akun') : '/login'} className="btn ml-2">{user ? (user.role === 'ADMIN' ? 'Dashboard' : 'Akun') : 'Login'}</Link>
          </nav>
          <button className="md:hidden glass-pill !p-2" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
        </div>
        {open && <nav className="md:hidden flex flex-col gap-2 p-3 border-t border-edge" onClick={() => setOpen(false)}>
          {nav.map(([to, l]) => <NavLink key={to} end={to === '/'} to={to} className={link}>{l}</NavLink>)}
          <NavLink to={user ? (user.role === 'ADMIN' ? '/admin' : '/akun') : '/login'} className={link}>{user ? 'Akun' : 'Login'}</NavLink></nav>}
      </header>
      <main className="flex-1"><AnimatePresence mode="wait">
        <motion.div key={pathname} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }} transition={{ duration: .35 }}>{outlet}</motion.div>
      </AnimatePresence></main>
      <footer className="bg-white/85 backdrop-blur border-t border-edge mt-16">
        <div className="mx-auto max-w-6xl p-8 grid md:grid-cols-3 gap-6 text-sm">
          <div><div className="flex items-center gap-2 font-extrabold"><img src="/logo.png" alt="Logo Yayasan Darul Ma'arif" className="h-9 w-9 object-contain" />XI AKL Class</div><p className="text-mute mt-2">Growing Together, Memories Forever.</p></div>
          <div className="flex flex-col gap-1">{nav.map(([to, l]) => <Link key={to} to={to}>{l}</Link>)}</div>
          <p className="text-mute">© {new Date().getFullYear()} XI AKL. Foto dan data siswa hanya tampil dengan izin. Ingin foto dikoreksi atau dihapus? Hubungi admin kelas.</p>
        </div>
      </footer>
    </div>
  )
}

function Home() {
  const photos = useGallery(); const [info] = useApi<any>('/public/class-info', { students: 0, albums: 0, media: 0 })
  const stats = [['Siswa', info.students], ['Album', info.albums], ['Dokumentasi', info.media], ['Tahun ajaran', '2026/2027']]
  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-mint blur-3xl opacity-70" aria-hidden />
        <div className="relative mx-auto max-w-6xl p-6 py-14 md:py-24 grid md:grid-cols-2 gap-10 items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7 }}>
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">Every Moment Has a Story.</h1>
            <p className="mt-5 text-mute max-w-md">Welcome to XI AKL — tempat cerita, persahabatan, tawa, dan kenangan kita tersimpan.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Link to="/siswa" className="btn">Kenali Teman Kami</Link><Link to="/galeri" className="btn btn-out">Jelajahi Kenangan</Link></div>
          </motion.div>
          <Ph i={0} cls="aspect-[4/3] rounded-3xl shadow-xl"><Camera size={40} /><span className="text-sm">Foto bersama kelas (placeholder)</span></Ph>
        </div>
      </section>
      <section className="mx-auto max-w-6xl p-6 mt-10">
        <Reveal><dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(([l, v]) => <div key={l} className="card p-5"><dd className="text-3xl font-extrabold text-leaf">{v}</dd><dt className="text-sm text-mute">{l}</dt></div>)}
        </dl></Reveal>
        
      </section>
      <section className="mx-auto max-w-6xl p-6 mt-8">
        <Reveal><h2 className="text-2xl font-extrabold mb-5">Kenangan pilihan</h2></Reveal>
        {photos.length === 0 && <p className="text-mute mb-4">Belum ada foto. Admin dapat menambahkannya lewat dashboard.</p>}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {photos.slice(0, 4).map((p, i) => (
            <Reveal key={p.id} delay={i * .08} className={i === 0 ? 'col-span-2 row-span-2' : ''}><Link to="/galeri" className="card overflow-hidden block h-full">
              <Pic p={p} cls={i === 0 ? 'aspect-square' : 'aspect-[4/3]'} />
              <div className="p-3"><b className="block">{p.title}</b><span className="text-xs text-mute">{fmt(p.date)} · {p.cat}</span><p className="text-sm text-mute mt-1">{p.desc}</p></div>
            </Link></Reveal>))}
        </div>
        <Link to="/galeri" className="btn mt-6">Lihat Semua Kenangan</Link>
      </section>
    </div>
  )
}

function Students() {
  const students = useStudents()
  const [q, setQ] = useState(''); const [no, setNo] = useState(''); const [asc, setAsc] = useState(true); const [n, setN] = useState(8)
  const list = useMemo(() => students.filter(s => s.name.toLowerCase().includes(q.toLowerCase()) && (no === '' || s.no === +no))
    .sort((a, b) => (asc ? 1 : -1) * a.name.localeCompare(b.name)), [students, q, no, asc])
  return (
    <div className="mx-auto max-w-6xl p-6">
      <H1>Profil Siswa</H1>
      <div className="flex flex-wrap gap-3 mb-6">
        <label className="relative"><span className="sr-only">Cari nama</span><Search size={16} className="absolute left-3 top-3.5 text-mute" /><input className="inp pl-9" placeholder="Cari nama" value={q} onChange={e => { setQ(e.target.value); setN(8) }} /></label>
        <label><span className="sr-only">Nomor absen</span><input className="inp w-32" type="number" min={1} placeholder="No. absen" value={no} onChange={e => setNo(e.target.value)} /></label>
        <select className="inp" aria-label="Urutkan" value={asc ? 'a' : 'z'} onChange={e => setAsc(e.target.value === 'a')}><option value="a">Nama A–Z</option><option value="z">Nama Z–A</option></select>
      </div>
      {list.length === 0 ? <div className="card p-10 text-center text-mute">Tidak ada siswa yang cocok. Coba kata kunci atau nomor lain.</div> :
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {list.slice(0, n).map((s, i) => (
            <Reveal key={s.id} delay={(i % 4) * .06}><div className="card overflow-hidden hover:-translate-y-1 transition">
              <Ph i={s.id} cls="aspect-square"><UserRound size={36} /></Ph>
              <div className="p-4"><b className="block">{s.name}</b><span className="text-xs text-mute">Absen {s.no}</span>
                <Link to={`/siswa/${s.id}`} className="btn btn-out mt-3 text-sm">Lihat Profil</Link></div>
            </div></Reveal>))}
        </div>}
      {n < list.length && <button className="btn mt-8" onClick={() => setN(n + 8)}>Muat lebih banyak</button>}
    </div>
  )
}

function StudentDetail() {
  const students = useStudents(); const id = useParams().id; const s = students.find(x => x.id === id)
  if (!s) return <div className="p-10 text-center">Siswa tidak ditemukan. <Link className="underline" to="/siswa">Kembali</Link></div>
  return (
    <div className="mx-auto max-w-4xl p-6 grid md:grid-cols-2 gap-8">
      <Ph i={s.id} cls="aspect-square rounded-3xl"><UserRound size={56} /></Ph>
      <div><Link to="/siswa" className="text-sm text-jade">← Semua siswa</Link>
        <h1 className="text-3xl font-extrabold mt-2">{s.name}</h1><p className="text-mute">Nomor absen {s.no}</p>
        <p className="mt-4">{s.bio}</p><p className="text-xs text-mute mt-6">Hanya informasi yang dipilih siswa yang ditampilkan di sini.</p></div>
    </div>
  )
}

function Lightbox({ list, idx, setIdx }: { list: Pho[]; idx: number; setIdx: (i: number | null) => void }) {
  const p = list[idx]; let x0 = 0
  const go = (d: number) => setIdx((idx + d + list.length) % list.length)
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' ? setIdx(null) : e.key === 'ArrowLeft' ? go(-1) : e.key === 'ArrowRight' ? go(1) : 0
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  })
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} role="dialog" aria-modal="true" aria-label={p.title}
      className="fixed inset-0 z-50 bg-black/85 flex flex-col items-center justify-center p-4"
      onTouchStart={e => (x0 = e.touches[0].clientX)} onTouchEnd={e => { const d = e.changedTouches[0].clientX - x0; if (Math.abs(d) > 50) go(d > 0 ? -1 : 1) }}>
      <button autoFocus aria-label="Tutup" onClick={() => setIdx(null)} className="absolute top-4 right-4 text-white"><X /></button>
      <button aria-label="Foto sebelumnya" onClick={() => go(-1)} className="absolute left-3 text-white"><ChevronLeft size={36} /></button>
      <button aria-label="Foto berikutnya" onClick={() => go(1)} className="absolute right-3 text-white"><ChevronRight size={36} /></button>
      {p.url ? <img src={p.url} alt={p.title} className="max-h-[70vh] max-w-full rounded-2xl object-contain" /> : <Ph i={p.id} cls="w-full max-w-2xl aspect-[4/3] rounded-2xl" />}
      <div className="text-white text-center mt-4" aria-live="polite"><b>{p.title}</b><div className="text-sm opacity-80">{fmt(p.date)} · {p.cat}</div><p className="text-sm opacity-80 max-w-md">{p.desc}</p></div>
    </motion.div>
  )
}

function Gallery() {
  const photos = useGallery()
  const [cat, setCat] = useState('Semua'); const [q, setQ] = useState(''); const [newest, setNewest] = useState(true); const [open, setOpen] = useState<number | null>(null)
  const list = useMemo(() => photos.filter(p => (cat === 'Semua' || p.cat === cat) && p.title.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (newest ? -1 : 1) * a.date.localeCompare(b.date)), [photos, cat, q, newest])
  return (
    <div className="mx-auto max-w-6xl p-6">
      <H1>Galeri Kenangan</H1>
      <div className="flex flex-wrap gap-2 mb-4">{['Semua', ...Array.from(new Set(photos.map(p => p.cat)))].map(c => (
        <button key={c} aria-pressed={cat === c} onClick={() => setCat(c)} className={`glass-pill${cat === c ? ' is-active' : ''}`}>{c}</button>))}</div>
      <div className="flex flex-wrap gap-3 mb-6">
        <input className="inp" aria-label="Cari judul" placeholder="Cari judul" value={q} onChange={e => setQ(e.target.value)} />
        <select className="inp" aria-label="Urutkan" value={newest ? 'n' : 'o'} onChange={e => setNewest(e.target.value === 'n')}><option value="n">Terbaru</option><option value="o">Terlama</option></select>
      </div>
      {list.length === 0 ? <div className="card p-10 text-center text-mute">Belum ada foto di kategori ini.</div> :
        <div className="columns-2 md:columns-3 gap-4">{list.map((p, i) => (
          <Reveal key={p.id} className="mb-4 break-inside-avoid"><button aria-label={`Buka ${p.title}`} onClick={() => setOpen(i)} className="block w-full card overflow-hidden text-left hover:shadow-lg transition">
            <Pic p={p} cls={p.ratio} /><div className="p-3"><b className="block text-sm">{p.title}</b><span className="text-xs text-mute">{fmt(p.date)}</span></div>
          </button></Reveal>))}</div>}
      <AnimatePresence>{open !== null && list[open] && <Lightbox list={list} idx={open} setIdx={setOpen} />}</AnimatePresence>
    </div>
  )
}

type Pho = { id: string; title: string; cat: string; date: string; desc: string; url: string; ratio: string }
const Pic = ({ p, cls }: { p: Pho; cls: string }) => p.url
  ? <img src={p.url} alt={p.title} loading="lazy" className={`w-full object-cover ${cls}`} /> : <Ph i={p.id} cls={cls} />
const useGallery = (): Pho[] => useApi<any[]>('/public/media', [])[0].map((m, i) => ({ id: m.id, title: m.title, cat: m.album?.category?.name ?? 'Lainnya',
  date: m.createdAt, desc: m.description || m.album?.title || '', url: asset(m.mediaUrl), ratio: ['aspect-[4/5]', 'aspect-square', 'aspect-[4/3]'][i % 3] }))
const useStudents = () => useApi<any[]>('/public/students', [])[0].map(s => ({ id: s.id as string, no: s.attendanceNumber as number, name: s.fullName as string, bio: (s.biography as string) || 'Belum ada deskripsi.' }))

type User = { id: string; username: string; role: 'ADMIN' | 'STUDENT' }
const Ctx = createContext<{ user: User | null; ready: boolean; setUser: (u: User | null) => void }>({ user: null, ready: false, setUser: () => {} })
const useAuth = () => useContext(Ctx)
function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null); const [ready, setReady] = useState(false)
  useEffect(() => { api<{ user: User }>('/auth/me').then(r => setUser(r.user)).catch(() => {}).finally(() => setReady(true)) }, [])
  return <Ctx.Provider value={{ user, ready, setUser }}>{children}</Ctx.Provider>
}

function Teachers() {
  const [teachers] = useApi<any[]>('/public/teachers', [])
  return (
    <div className="mx-auto max-w-6xl p-6">
      <H1>Guru Kami</H1>
      <p className="text-mute mb-8 -mt-3">Para guru yang mendampingi XI AKL.</p>
      {teachers.length === 0 && <p className="text-mute">Belum ada data guru.</p>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{teachers.map((t, i) => (
        <Reveal key={t.id} delay={(i % 3) * .08}><article className="card overflow-hidden h-full">
          <Ph i={t.id} cls="aspect-[4/3]"><UserRound size={44} /></Ph>
          <div className="p-5"><h2 className="font-extrabold text-lg">{t.name}</h2>
            <span className="inline-block mt-1 px-3 py-1 rounded-full bg-mint text-xs font-bold">{t.subject}</span>
            <p className="text-sm text-mute mt-3">{t.description}</p></div>
        </article></Reveal>))}</div>
    </div>
  )
}

function Stories() {
  const [stories] = useApi<any[]>('/public/stories', [])
  return (
    <div className="mx-auto max-w-3xl p-6">
      <H1>Cerita Kelas</H1>
      <p className="text-mute mb-8">Perjalanan XI AKL dari waktu ke waktu.</p>
      {stories.length === 0 && <p className="text-mute">Belum ada cerita yang dipublikasikan.</p>}
      <ol className="border-l-2 border-edge ml-2 space-y-8">{stories.map(s => (
        <li key={s.id} className="pl-6 relative"><span className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-jade ring-4 ring-mint" />
          <Reveal><time className="text-xs text-mute">{fmt(s.publishedAt ?? s.createdAt)}</time><h2 className="font-bold text-lg">{s.title}</h2><p className="text-mute whitespace-pre-line">{s.content}</p></Reveal></li>))}</ol>
    </div>
  )
}

function Login() {
  const { setUser } = useAuth(); const nav = useNavigate()
  const [u, setU] = useState(''); const [p, setP] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('')
    try { const r = await api<{ user: User }>('/auth/login', { method: 'POST', body: { username: u, password: p } }); setUser(r.user); nav(r.user.role === 'ADMIN' ? '/admin' : '/akun') }
    catch (x: any) { setErr(x.message) } finally { setBusy(false) }
  }
  return (
    <div className="mx-auto max-w-md p-6 mt-10"><form onSubmit={submit} className="card p-8 space-y-4">
      <h1 className="text-2xl font-extrabold">Login</h1>
      <input className="inp w-full" placeholder="Username" aria-label="Username" autoComplete="username" value={u} onChange={e => setU(e.target.value)} />
      <input className="inp w-full" type="password" placeholder="Password" aria-label="Password" autoComplete="current-password" value={p} onChange={e => setP(e.target.value)} />
      {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
      <button className="btn w-full justify-center" disabled={busy}>{busy ? 'Memproses...' : 'Masuk'}</button>
      <p className="text-xs text-mute">Akun dibuat oleh admin kelas. Tidak ada pendaftaran publik.</p>
    </form></div>
  )
}

function Account() {
  const { user, ready, setUser } = useAuth(); const [p, setP] = useState<any>(null); const [msg, setMsg] = useState(''); const [text, setText] = useState('')
  useEffect(() => { if (user) api('/student/profile').then(setP).catch(() => {}) }, [user])
  if (!ready) return null
  if (!user) return <Navigate to="/login" replace />
  const run = async (fn: () => Promise<any>, ok: string) => { setMsg(''); try { await fn(); setMsg(ok) } catch (x: any) { setMsg(x.message) } }
  return (
    <div className="mx-auto max-w-2xl p-6 space-y-6">
      <div className="flex items-center justify-between"><H1>Halo, {user.username}</H1>
        <button className="btn btn-out" onClick={async () => { await api('/auth/logout', { method: 'POST' }); setUser(null) }}>Keluar</button></div>
      {user.role === 'ADMIN' && <Link to="/admin" className="btn">Buka dashboard admin</Link>}
      {p && <div className="card p-6 space-y-3"><h2 className="font-bold">Profil saya ({p.fullName})</h2>
        <textarea className="inp w-full" rows={3} maxLength={500} placeholder="Deskripsi pribadi" value={p.biography ?? ''} onChange={e => setP({ ...p, biography: e.target.value })} />
        <select className="inp" aria-label="Visibilitas profil" value={p.profileVisibility} onChange={e => setP({ ...p, profileVisibility: e.target.value })}>
          <option value="PRIVATE">Privat (hanya admin)</option><option value="MEMBERS">Hanya teman sekelas yang login</option><option value="PUBLIC">Publik</option></select>
        <button className="btn" onClick={() => run(() => api('/student/profile', { method: 'PATCH', body: { biography: p.biography ?? '', profileVisibility: p.profileVisibility } }), 'Profil disimpan')}>Simpan profil</button></div>}
      <div className="card p-6 space-y-3"><h2 className="font-bold">Kirim pesan dan kesan</h2>
        <textarea className="inp w-full" rows={3} maxLength={1000} value={text} onChange={e => setText(e.target.value)} />
        <button className="btn" onClick={() => run(async () => { await api('/student/memory-messages', { method: 'POST', body: { content: text } }); setText('') }, 'Terkirim, menunggu persetujuan admin')}>Kirim</button></div>
      {msg && <p role="status" className="text-sm">{msg}</p>}
    </div>
  )
}

type F = { k: string; l: string; t?: 'number' | 'password' | 'textarea' | 'select'; opts?: string[]; from?: string }
type Cfg = { label: string; ep: string; cols: string[]; fields: F[] }
const V = ['PUBLIC', 'MEMBERS', 'PRIVATE']
const TABS: Record<string, Cfg> = {
  students: { label: 'Siswa', ep: 'students', cols: ['attendanceNumber', 'fullName'], fields: [{ k: 'fullName', l: 'Nama lengkap' }, { k: 'attendanceNumber', l: 'No. absen', t: 'number' },
    { k: 'username', l: 'Username (akun baru)' }, { k: 'password', l: 'Password awal (min 10)', t: 'password' }, { k: 'biography', l: 'Deskripsi', t: 'textarea' }, { k: 'profileVisibility', l: 'Visibilitas profil', t: 'select', opts: V }] },
  teachers: { label: 'Guru', ep: 'teachers', cols: ['name', 'subject'], fields: [{ k: 'name', l: 'Nama guru' }, { k: 'subject', l: 'Mata pelajaran' }, { k: 'description', l: 'Deskripsi singkat', t: 'textarea' }] },
  categories: { label: 'Kategori', ep: 'categories', cols: ['name', 'slug'], fields: [{ k: 'name', l: 'Nama kategori' }, { k: 'slug', l: 'slug (huruf kecil-dengan-strip)' }] },
  albums: { label: 'Album', ep: 'albums', cols: ['title', 'visibility'], fields: [{ k: 'title', l: 'Judul album' }, { k: 'slug', l: 'slug' }, { k: 'description', l: 'Deskripsi', t: 'textarea' },
    { k: 'categoryId', l: 'Kategori', t: 'select', from: 'categories' }, { k: 'visibility', l: 'Visibilitas', t: 'select', opts: V }] },
  stories: { label: 'Cerita', ep: 'stories', cols: ['title', 'status'], fields: [{ k: 'title', l: 'Judul' }, { k: 'slug', l: 'slug' }, { k: 'content', l: 'Isi cerita', t: 'textarea' }, { k: 'status', l: 'Status', t: 'select', opts: ['DRAFT', 'PUBLISHED'] }] },
}

function Manage({ cfg }: { cfg: Cfg }) {
  const [rows, setRows] = useState<any[]>([]); const [f, setF] = useState<any>({}); const [editId, setEditId] = useState<string | null>(null)
  const [err, setErr] = useState(''); const [lists, setLists] = useState<Record<string, any[]>>({})
  const load = () => api<any>(`/admin/${cfg.ep}`).then(r => setRows(Array.isArray(r) ? r : r.items)).catch(e => setErr(e.message))
  useEffect(() => { load(); cfg.fields.forEach(x => x.from && api<any>(`/admin/${x.from}`).then(r => setLists(l => ({ ...l, [x.from!]: r.items })))) }, [])
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr(''); const body: any = {}
    for (const x of cfg.fields) { const v = f[x.k]; if (v === undefined || v === '' || v === null) continue; body[x.k] = x.t === 'number' ? Number(v) : v }
    if (cfg.ep === 'stories' && body.status === 'PUBLISHED') body.publishedAt = new Date().toISOString()
    try { await api(editId ? `/admin/${cfg.ep}/${editId}` : `/admin/${cfg.ep}`, { method: editId ? 'PATCH' : 'POST', body }); setF({}); setEditId(null); load() } catch (x: any) { setErr(x.message) }
  }
  const set = (k: string, v: string) => setF({ ...f, [k]: v })
  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="card p-4 grid sm:grid-cols-2 gap-3">
        {cfg.fields.map(x => x.t === 'select'
          ? <select key={x.k} className="inp" aria-label={x.l} value={f[x.k] ?? ''} onChange={e => set(x.k, e.target.value)}><option value="">{x.l}</option>
              {(x.opts ?? (lists[x.from!] ?? []).map(o => o.id)).map((o, i) => <option key={o} value={o}>{x.opts ? o : (lists[x.from!][i].name ?? lists[x.from!][i].title)}</option>)}</select>
          : x.t === 'textarea' ? <textarea key={x.k} className="inp sm:col-span-2" placeholder={x.l} value={f[x.k] ?? ''} onChange={e => set(x.k, e.target.value)} />
          : <input key={x.k} className="inp" type={x.t ?? 'text'} placeholder={x.l} value={f[x.k] ?? ''} onChange={e => set(x.k, e.target.value)} />)}
        <div className="sm:col-span-2 flex gap-2"><button className="btn">{editId ? 'Simpan perubahan' : 'Tambah'}</button>
          {editId && <button type="button" className="btn btn-out" onClick={() => { setEditId(null); setF({}) }}>Batal</button>}</div>
        {err && <p role="alert" className="sm:col-span-2 text-sm text-red-600">{err}</p>}
      </form>
      <div className="card overflow-x-auto"><table className="w-full text-left text-sm"><tbody>{rows.map(r => (
        <tr key={r.id} className="border-t border-edge first:border-0">{cfg.cols.map(c => <td key={c} className="p-3">{String(r[c] ?? '')}</td>)}
          <td className="p-3 text-right whitespace-nowrap"><button className="underline mr-3" onClick={() => { setEditId(r.id); setF(r); window.scrollTo(0, 0) }}>Ubah</button>
            <button className="text-red-600 underline" onClick={async () => { if (confirm('Hapus data ini?')) { try { await api(`/admin/${cfg.ep}/${r.id}`, { method: 'DELETE' }); load() } catch (x: any) { setErr(x.message) } } }}>Hapus</button></td></tr>))}
        {rows.length === 0 && <tr><td className="p-4 text-mute">Belum ada data.</td></tr>}</tbody></table></div>
    </div>
  )
}

function Upload() {
  const [albums, setAlbums] = useState<any[]>([]); const [items, setItems] = useState<any[]>([]); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false)
  const load = () => api<any[]>('/admin/media').then(setItems).catch(e => setMsg(e.message))
  useEffect(() => { api<any>('/admin/albums').then(r => setAlbums(r.items)); load() }, [])
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const form = e.currentTarget; setBusy(true); setMsg('Mengunggah...')
    try { await api('/admin/media', { method: 'POST', body: new FormData(form) }); form.reset(); setMsg('Foto tersimpan'); load() } catch (x: any) { setMsg(x.message) }
    setBusy(false)
  }
  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="card p-4 grid sm:grid-cols-2 gap-3">
        <select name="albumId" required className="inp" aria-label="Album"><option value="">Pilih album</option>{albums.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}</select>
        <input name="title" required className="inp" placeholder="Judul foto" />
        <select name="visibility" className="inp" aria-label="Visibilitas" defaultValue="PRIVATE">{V.map(v => <option key={v}>{v}</option>)}</select>
        <input name="file" type="file" required accept="image/jpeg,image/png,image/webp" className="inp" aria-label="File foto (maks 5 MB)" />
        <button className="btn sm:col-span-2 justify-center" disabled={busy}>Unggah foto</button>
        {msg && <p role="status" className="sm:col-span-2 text-sm">{msg}</p>}
      </form>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{items.map(m => (
        <div key={m.id} className="card overflow-hidden"><img src={asset(m.mediaUrl)} alt={m.title} className="aspect-square w-full object-cover" />
          <div className="p-2 text-xs"><b className="block truncate">{m.title}</b>{m.visibility}
            <button className="block text-red-600 underline" onClick={async () => { if (confirm('Hapus foto ini?')) { await api(`/admin/media/${m.id}`, { method: 'DELETE' }); load() } }}>Hapus</button></div></div>))}</div>
    </div>
  )
}

function Moderation() {
  const [rows, setRows] = useState<any[]>([])
  const load = () => api<any>('/admin/memory-messages').then(r => setRows(r.items))
  useEffect(() => { load() }, [])
  const set = async (id: string, status: string) => { await api(`/admin/memory-messages/${id}`, { method: 'PATCH', body: { status } }); load() }
  return <div className="space-y-3">{rows.length === 0 && <p className="text-mute">Belum ada pesan.</p>}{rows.map(m => (
    <div key={m.id} className="card p-4"><p>{m.content}</p><p className="text-xs text-mute my-2">Status: {m.status}</p>
      <button className="btn mr-2" onClick={() => set(m.id, 'PUBLISHED')}>Setujui</button><button className="btn btn-out" onClick={() => set(m.id, 'REJECTED')}>Tolak</button></div>))}</div>
}

function Admin() {
  const { user, ready, setUser } = useAuth(); const [tab, setTab] = useState('students')
  if (!ready) return null
  if (user?.role !== 'ADMIN') return <Navigate to="/login" replace />
  const names: [string, string][] = [...Object.entries(TABS).map(([k, c]) => [k, c.label] as [string, string]), ['media', 'Foto'], ['messages', 'Pesan']]
  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="flex items-center justify-between mb-4"><H1>Dashboard Admin</H1>
        <button className="btn btn-out" onClick={async () => { await api('/auth/logout', { method: 'POST' }); setUser(null) }}>Keluar</button></div>
      <div className="flex flex-wrap gap-2 mb-6">{names.map(([k, l]) => <button key={k} className={`glass-pill${tab === k ? ' is-active' : ''}`} onClick={() => setTab(k)}>{l}</button>)}</div>
      {tab === 'media' ? <Upload /> : tab === 'messages' ? <Moderation /> : <Manage key={tab} cfg={TABS[tab]} />}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider><BrowserRouter><Routes><Route element={<Layout />}>
      <Route index element={<Home />} /><Route path="siswa" element={<Students />} /><Route path="siswa/:id" element={<StudentDetail />} />
      <Route path="galeri" element={<Gallery />} /><Route path="guru" element={<Teachers />} /><Route path="cerita" element={<Stories />} /><Route path="login" element={<Login />} /><Route path="akun" element={<Account />} /><Route path="admin" element={<Admin />} />
    </Route></Routes></BrowserRouter></AuthProvider>
  )
}
