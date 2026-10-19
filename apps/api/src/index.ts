import { app } from './app'
import { env } from './lib'
app.listen(env.port, () => console.log(`API berjalan di http://localhost:${env.port}`))
