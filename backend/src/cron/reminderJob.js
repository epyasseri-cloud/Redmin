/**
 * Technical overview:
 * - Layer: scheduled job
 * - Responsibility: find expiring documents and dispatch reminders
 * - Behavior: deduplicate daily sends and return execution stats
 */

import cron from 'node-cron'
import { supabaseAdmin } from '../utils/supabaseClient.js'
import {
  buildReminderMessage,
  sendEmailReminder,
  sendSmsReminder,
} from '../services/notificationService.js'

const DAY_MS = 24 * 60 * 60 * 1000

function toISODateUTC(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
    .toISOString()
    .slice(0, 10)
}

function addDaysISO(baseDateISO, days) {
  const [year, month, day] = baseDateISO.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return date.toISOString().slice(0, 10)
}

function dayDiff(baseDateISO, targetDateISO) {
  const [y1, m1, d1] = baseDateISO.split('-').map(Number)
  const [y2, m2, d2] = targetDateISO.split('-').map(Number)
  const t1 = Date.UTC(y1, m1 - 1, d1)
  const t2 = Date.UTC(y2, m2 - 1, d2)
  return Math.floor((t2 - t1) / DAY_MS)
}

function parseReminderDays(value) {
  const raw = value || '30,7,1,0'

  return raw
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((n) => Number.isInteger(n) && n >= 0)
    .filter((n, idx, arr) => arr.indexOf(n) === idx)
    .sort((a, b) => a - b)
}

async function fetchProfilesByUserIds(userIds) {
  if (!userIds.length) return new Map()

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, email, has_sms, phone_number')
    .in('id', userIds)

  if (error) {
    throw new Error(`No se pudieron cargar perfiles: ${error.message}`)
  }

  return new Map((data || []).map((profile) => [profile.id, profile]))
}

async function markReminderSent(documentId) {
  const { error } = await supabaseAdmin
    .from('documents')
    .update({ last_reminder_sent: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', documentId)

  if (error) {
    console.error(`[Reminder] No se pudo actualizar last_reminder_sent para ${documentId}:`, error.message)
  }
}

function wasSentToday(lastReminderSentISO, todayISO) {
  if (!lastReminderSentISO) return false
  return String(lastReminderSentISO).slice(0, 10) === todayISO
}

export async function runReminderCycle(source = 'manual') {
  const reminderDays = parseReminderDays(process.env.REMINDER_DAYS_BEFORE)
  const maxDays = reminderDays[reminderDays.length - 1]

  if (!reminderDays.length) {
    return {
      source,
      scanned: 0,
      candidates: 0,
      sentEmail: 0,
      sentSms: 0,
      skipped: 0,
      errors: 0,
      message: 'No hay dias configurados en REMINDER_DAYS_BEFORE.',
    }
  }

  const todayISO = toISODateUTC(new Date())
  const upperBoundISO = addDaysISO(todayISO, maxDays)

  const { data: docs, error } = await supabaseAdmin
    .from('documents')
    .select('id, user_id, tipo_doc, expiry_date, active, last_reminder_sent')
    .eq('active', true)
    .gte('expiry_date', todayISO)
    .lte('expiry_date', upperBoundISO)

  if (error) {
    throw new Error(`No se pudieron consultar documentos: ${error.message}`)
  }

  const scanned = docs?.length || 0
  const userIds = [...new Set((docs || []).map((doc) => doc.user_id).filter(Boolean))]
  const profilesByUserId = await fetchProfilesByUserIds(userIds)

  const stats = {
    source,
    scanned,
    candidates: 0,
    sentEmail: 0,
    sentSms: 0,
    skipped: 0,
    errors: 0,
  }

  for (const doc of docs || []) {
    const daysRemaining = dayDiff(todayISO, doc.expiry_date)

    if (!reminderDays.includes(daysRemaining)) {
      stats.skipped += 1
      continue
    }

    if (wasSentToday(doc.last_reminder_sent, todayISO)) {
      stats.skipped += 1
      continue
    }

    const profile = profilesByUserId.get(doc.user_id)

    if (!profile?.email) {
      stats.skipped += 1
      continue
    }

    stats.candidates += 1

    const { subject, text } = buildReminderMessage({
      tipoDoc: doc.tipo_doc,
      expiryDate: doc.expiry_date,
      daysRemaining,
    })

    const smsEligible = profile.has_sms && profile.phone_number

    // Academic rubric: run independent channel calls in parallel.
    const [emailResult, smsResult] = await Promise.all([
      sendEmailReminder({
        to: profile.email,
        subject,
        text,
      }),
      smsEligible
        ? sendSmsReminder({
            to: profile.phone_number,
            text,
          })
        : Promise.resolve({ channel: 'sms', sent: false, skipped: true, reason: 'missing_phone' }),
    ])

    if (emailResult.sent) {
      stats.sentEmail += 1
    } else if (!emailResult.skipped) {
      stats.errors += 1
    }

    if (smsResult.sent) {
      stats.sentSms += 1
    } else if (!smsResult.skipped) {
      stats.errors += 1
    }

    if (emailResult.sent || smsResult.sent) {
      await markReminderSent(doc.id)
    }
  }

  return stats
}

export function startReminderScheduler() {
  const enabled = process.env.REMINDER_CRON_ENABLED !== 'false'

  if (!enabled) {
    console.log('[Reminder] Scheduler desactivado por REMINDER_CRON_ENABLED=false')
    return null
  }

  const cronExpr = process.env.REMINDER_CRON || '0 9 * * *'
  const timezone = process.env.REMINDER_TIMEZONE || 'Europe/Madrid'

  const task = cron.schedule(
    cronExpr,
    async () => {
      try {
        const stats = await runReminderCycle('cron')
        console.log('[Reminder] Ciclo completado:', stats)
      } catch (error) {
        console.error('[Reminder] Error en ciclo cron:', error.message)
      }
    },
    {
      timezone,
    }
  )

  console.log(`[Reminder] Scheduler activo. Cron: ${cronExpr} | TZ: ${timezone}`)

  if (process.env.REMINDER_RUN_ON_START === 'true') {
    runReminderCycle('startup')
      .then((stats) => console.log('[Reminder] Ejecucion inicial:', stats))
      .catch((error) => console.error('[Reminder] Error en ejecucion inicial:', error.message))
  }

  return task
}

