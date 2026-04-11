import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import authRoutes from './routes/authRoutes.js'
import documentRoutes from './routes/documentRoutes.js'
import ocrRoutes from './routes/ocrRoutes.js'

const app = express()
const port = process.env.PORT || 4000

app.use(helmet())
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }))
app.use(express.json({ limit: '2mb' }))
app.use(morgan('dev'))

app.use('/api/auth', authRoutes)
app.use('/api/documents', documentRoutes)
app.use('/api/ocr', ocrRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'docremind-backend' })
})

app.listen(port, () => {
  console.log(`DocRemind backend listening on port ${port}`)
})
