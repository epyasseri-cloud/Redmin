import { Router } from 'express'
import { runReminderCycle } from '../cron/reminderJob.js'
import { requireAuth } from '../middlewares/authMiddleware.js'
import { supabaseAdmin } from '../utils/supabaseClient.js'
import { sendEmailReminder } from '../services/notificationService.js'

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

router.post('/test-email', requireAuth, async (req, res) => {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('email')
    .eq('id', req.user.id)
    .maybeSingle()

  if (error) {
    return res.status(500).json({ message: 'No se pudo cargar el perfil del usuario.' })
  }

  if (!profile?.email) {
    return res.status(400).json({ message: 'No tienes un email configurado en tu perfil.' })
  }

  const result = await sendEmailReminder({
    to: profile.email,
    subject: 'Prueba de correo DocRemind',
    text: 'Este es un correo de prueba para validar la configuracion de envio (Gmail o SendGrid).',
  })

  if (!result.sent) {
    const reason = result.reason || result.error || 'No se pudo enviar el correo de prueba.'
    return res.status(500).json({ ok: false, message: reason, result })
  }

  return res.json({ ok: true, message: `Correo de prueba enviado a ${profile.email}.`, result })
})

export default router
