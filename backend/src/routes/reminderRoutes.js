import { Router } from 'express'
import { runReminderCycle } from '../cron/reminderJob.js'

const router = Router()

function hasValidInternalSecret(req) {
  const expectedSecret = process.env.REMINDER_RUN_SECRET
  const providedSecret = req.headers['x-reminder-secret']

  if (!expectedSecret || expectedSecret.startsWith('YOUR_')) {
    return false
  }

  return providedSecret === expectedSecret
}

router.post('/run', async (req, res) => {
  if (!hasValidInternalSecret(req)) {
    return res.status(401).json({ message: 'Unauthorized reminder run.' })
  }

  try {
    const stats = await runReminderCycle('http')
    return res.json({ ok: true, stats })
  } catch (error) {
    console.error('[Reminder] Error on manual run:', error.message)
    return res.status(500).json({ ok: false, message: 'No se pudo ejecutar el ciclo de recordatorios.' })
  }
})

export default router
