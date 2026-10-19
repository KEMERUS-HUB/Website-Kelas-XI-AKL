// Salin index.html menjadi 404.html agar hosting statis tetap memuat aplikasi saat halaman seperti /galeri di-refresh.
import { copyFileSync } from 'node:fs'
copyFileSync('dist/index.html', 'dist/404.html')
console.log('dist/404.html dibuat')
