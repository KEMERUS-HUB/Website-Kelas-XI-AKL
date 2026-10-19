import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// Saat pengembangan, permintaan /api diteruskan ke backend (satu asal, cookie login aman).
export default defineConfig({ plugins: [react()], server: { proxy: { '/api': 'http://localhost:4000' } } })
