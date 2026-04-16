import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { fileURLToPath } from 'url'
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
const isVercel = process.env.VERCEL === '1'
const allowVercelPreviews = process.env.ALLOW_VERCEL_PREVIEWS === 'true'
const allowAllVercelOrigins = process.env.ALLOW_ALL_VERCEL_ORIGINS === 'true'
const defaultAllowedOrigins = ['http://localhost:5173', 'http://localhost:5174']

function normalizeOrigin(value) {
  return String(value || '').trim().replace(/\/$/, '')
}

const configuredOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => normalizeOrigin(origin))
  .filter(Boolean)
const allowedOrigins =
  configuredOrigins.length > 0 ? configuredOrigins : defaultAllowedOrigins.map((origin) => normalizeOrigin(origin))

function isAllowedOrigin(origin) {
  if (!origin) {
    return true
  }

  const normalizedOrigin = normalizeOrigin(origin)

  if (allowedOrigins.includes(normalizedOrigin)) {
    return true
  }

  if (isProd && allowVercelPreviews && /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(normalizedOrigin)) {
    return true
  }

  if (isVercel && allowAllVercelOrigins && /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(normalizedOrigin)) {
    return true
  }

  if (!isProd && /^http:\/\/localhost:\d+$/.test(normalizedOrigin)) {
    return true
  }

  return false
}

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, true)
    }

    return callback(new Error('Not allowed by CORS'))
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
}

app.use(helmet())
app.use(cors(corsOptions))
app.options('*', cors(corsOptions))
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

const currentFilePath = fileURLToPath(import.meta.url)
const entryFilePath = process.argv[1]
const isDirectRun = currentFilePath === entryFilePath

if (isDirectRun && !isVercel) {
  app.listen(port, () => {
    console.log(`DocRemind backend listening on port ${port}`)
    startReminderScheduler()
  })
}

export default app
