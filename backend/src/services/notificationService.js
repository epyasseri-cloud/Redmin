import sendgrid from '@sendgrid/mail'
import twilio from 'twilio'

let sendgridReady = false
let twilioClient = null

function ensureSendgrid() {
  if (sendgridReady) return true

  const apiKey = process.env.SENDGRID_API_KEY
  if (!apiKey || apiKey.startsWith('YOUR_')) {
    return false
  }

  sendgrid.setApiKey(apiKey)
  sendgridReady = true
  return true
}

function ensureTwilio() {
  if (twilioClient) return twilioClient

  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN

  if (!sid || !token || sid.startsWith('YOUR_') || token.startsWith('YOUR_')) {
    return null
  }

  twilioClient = twilio(sid, token)
  return twilioClient
}

function normalizedTypeLabel(tipoDoc) {
  if (!tipoDoc) return 'documento'
  return tipoDoc.replace(/_/g, ' ')
}

export function buildReminderMessage({ tipoDoc, expiryDate, daysRemaining }) {
  const kind = normalizedTypeLabel(tipoDoc)
  const daysText =
    daysRemaining === 0
      ? 'vence hoy'
      : daysRemaining === 1
      ? 'vence manana'
      : `vence en ${daysRemaining} dias`

  const subject = `Recordatorio DocRemind: ${kind}`
  const text = `Tu ${kind} con fecha ${expiryDate} ${daysText}. Revisa tu panel de DocRemind para mantenerlo al dia.`

  return { subject, text }
}

export async function sendEmailReminder({ to, subject, text }) {
  if (!to) {
    return { channel: 'email', sent: false, skipped: true, reason: 'missing_recipient' }
  }

  if (!ensureSendgrid()) {
    console.warn('[Reminder] SendGrid no configurado. Se omite envio email.')
    return { channel: 'email', sent: false, skipped: true, reason: 'sendgrid_not_configured' }
  }

  try {
    await sendgrid.send({
      to,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@docremind.local',
      subject,
      text,
    })

    return { channel: 'email', sent: true }
  } catch (error) {
    console.error('[Reminder] Error enviando email:', error.message)
    return { channel: 'email', sent: false, error: error.message }
  }
}

export async function sendSmsReminder({ to, text }) {
  const from = process.env.TWILIO_FROM_PHONE

  if (!to || !from) {
    return { channel: 'sms', sent: false, skipped: true, reason: 'missing_phone' }
  }

  const client = ensureTwilio()

  if (!client) {
    console.warn('[Reminder] Twilio no configurado. Se omite envio SMS.')
    return { channel: 'sms', sent: false, skipped: true, reason: 'twilio_not_configured' }
  }

  try {
    await client.messages.create({
      to,
      from,
      body: text,
    })

    return { channel: 'sms', sent: true }
  } catch (error) {
    console.error('[Reminder] Error enviando SMS:', error.message)
    return { channel: 'sms', sent: false, error: error.message }
  }
}
