import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import authRoutes from './routes/authRoutes.js'
import documentRoutes from './routes/documentRoutes.js'
import ocrRoutes from './routes/ocrRoutes.js'
import reminderRoutes from './routes/reminderRoutes.js'
import { startReminderScheduler } from './cron/reminderJob.js'
import {
  authLimiter,
  generalLimiter,
  ocrLimiter,
} from './middlewares/rateLimiter.js'

const app = express()
const port = process.env.PORT || 4000
const isProd = process.env.NODE_ENV === 'production'
const defaultAllowedOrigins = ['http://localhost:5173', 'http://localhost:5174']
const configuredOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
const allowedOrigins = configuredOrigins.length > 0 ? configuredOrigins : defaultAllowedOrigins

function isAllowedOrigin(origin) {
  if (!origin) {
    return true
  }

  if (allowedOrigins.includes(origin)) {
    return true
  }

  if (!isProd && /^http:\/\/localhost:\d+$/.test(origin)) {
    return true
  }

  return false
}

app.use(helmet())
app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        return callback(null, true)
      }

      return callback(new Error('Not allowed by CORS'))
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)
app.use(express.json({ limit: '500kb' }))
app.use(morgan(isProd ? 'combined' : 'dev'))

app.use('/api', generalLimiter)
app.use('/api/auth', authLimiter, authRoutes)
app.use('/api/documents', documentRoutes)
app.use('/api/ocr', ocrLimiter, ocrRoutes)
app.use('/api/reminders', reminderRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'docremind-backend' })
})

// Global error handler — never leaks stack traces to clients
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[Unhandled error]', err.message)
  res.status(err.status || 500).json({
    message: isProd ? 'Error interno del servidor.' : err.message,
  })
})

app.listen(port, () => {
  console.log(`DocRemind backend listening on port ${port}`)
  startReminderScheduler()
})
