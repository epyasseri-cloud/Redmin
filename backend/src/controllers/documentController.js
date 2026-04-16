/**
 * Technical overview:
 * - Layer: controller
 * - Responsibility: document CRUD, date extraction, and test email trigger
 * - Validation: tipo_doc whitelist, ISO date format, ownership checks
 */

import { extractExpiryDate } from '../utils/regexExtractor.js'
import { extractDateWithAI } from '../services/openaiService.js'
import { supabaseAdmin } from '../utils/supabaseClient.js'
import { sendEmailReminder } from '../services/notificationService.js'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MAX_OCR_TEXT_LENGTH = 10_000
const ALLOWED_TIPOS = new Set([
  'ine',
  'dni_espanol',
  'pasaporte',
  'licencia_conducir',
  'tarjeta_residencia',
  'seguro',
  'otro',
])
const EXPIRY_HINTS = [
  'vigencia',
  'vencimiento',
  'caducidad',
  'caduca',
  'expira',
  'expiry',
  'expiration',
  'valid until',
  'valid to',
  'validity',
]
const BIRTH_HINTS = [
  'nacimiento',
  'fecha de nacimiento',
  'birth',
  'date of birth',
  'dob',
]

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function hasAnyHint(text, hints) {
  return hints.some((hint) => text.includes(hint))
}

function isTokenNearHint(text, token, hints, radius = 64) {
  if (!token) return false

  const tokenIndices = []
  let from = 0
  while (from < text.length) {
    const idx = text.indexOf(token, from)
    if (idx === -1) break
    tokenIndices.push(idx)
    from = idx + Math.max(1, token.length)
  }

  if (tokenIndices.length === 0) return false

  for (const hint of hints) {
    let hintFrom = 0
    while (hintFrom < text.length) {
      const hintIdx = text.indexOf(hint, hintFrom)
      if (hintIdx === -1) break

      for (const tokenIdx of tokenIndices) {
        if (Math.abs(tokenIdx - hintIdx) <= radius) {
          return true
        }
      }

      hintFrom = hintIdx + Math.max(1, hint.length)
    }
  }

  return false
}

function isLikelyBirthDate(rawText, isoDate) {
  if (!rawText || !isoDate) return false

  const normalized = normalizeText(rawText)
  const [year, month, day] = isoDate.split('-')

  if (!year || !month || !day) return false

  const dayNum = String(Number(day))
  const monthNum = String(Number(month))
  const ddmmyyyyA = `${day}/${month}/${year}`
  const ddmmyyyyB = `${dayNum}/${monthNum}/${year}`
  const ddmmyyyyC = `${day}-${month}-${year}`
  const ddmmyyyyD = `${dayNum}-${monthNum}-${year}`

  const birthLinked =
    isTokenNearHint(normalized, ddmmyyyyA, BIRTH_HINTS) ||
    isTokenNearHint(normalized, ddmmyyyyB, BIRTH_HINTS) ||
    isTokenNearHint(normalized, ddmmyyyyC, BIRTH_HINTS) ||
    isTokenNearHint(normalized, ddmmyyyyD, BIRTH_HINTS) ||
    isTokenNearHint(normalized, year, BIRTH_HINTS)

  if (!birthLinked) return false

  const expiryLinked =
    isTokenNearHint(normalized, ddmmyyyyA, EXPIRY_HINTS) ||
    isTokenNearHint(normalized, ddmmyyyyB, EXPIRY_HINTS) ||
    isTokenNearHint(normalized, ddmmyyyyC, EXPIRY_HINTS) ||
    isTokenNearHint(normalized, ddmmyyyyD, EXPIRY_HINTS) ||
    isTokenNearHint(normalized, year, EXPIRY_HINTS)

  if (expiryLinked) return false

  return hasAnyHint(normalized, BIRTH_HINTS)
}

function isValidDate(value) {
  return typeof value === 'string' && DATE_RE.test(value)
}

function isAllowedTipo(value) {
  return typeof value === 'string' && ALLOWED_TIPOS.has(value)
}

export async function extractDocumentDate(req, res) {
  const { text, tipo_doc } = req.body

  if (!text || !tipo_doc) {
    return res.status(400).json({ message: 'Se requieren los campos text y tipo_doc.' })
  }

  if (!isAllowedTipo(tipo_doc)) {
    return res.status(400).json({ message: 'Tipo de documento no valido.' })
  }

  if (typeof text !== 'string' || text.length > MAX_OCR_TEXT_LENGTH) {
    return res.status(400).json({ message: 'El texto supera el tamano maximo permitido.' })
  }

  let expiryDate = extractExpiryDate(text)
  let method = 'regex'

  if (expiryDate && isLikelyBirthDate(text, expiryDate)) {
    expiryDate = null
  }

  if (!expiryDate) {
    expiryDate = await extractDateWithAI(text, tipo_doc)

    if (expiryDate && isLikelyBirthDate(text, expiryDate)) {
      expiryDate = null
    }

    method = expiryDate ? 'openai' : 'manual'
  }

  return res.json({ expiry_date: expiryDate, method })
}

export async function createDocument(req, res) {
  const { tipo_doc, expiry_date } = req.body

  if (!tipo_doc || !expiry_date) {
    return res.status(400).json({ message: 'Se requieren tipo_doc y expiry_date.' })
  }

  if (!isAllowedTipo(tipo_doc)) {
    return res.status(400).json({ message: 'Tipo de documento no valido.' })
  }

  if (!isValidDate(expiry_date)) {
    return res.status(400).json({ message: 'La fecha debe estar en formato YYYY-MM-DD.' })
  }

  const { data, error } = await supabaseAdmin
    .from('documents')
    .insert({ user_id: req.user.id, tipo_doc, expiry_date, active: true })
    .select()
    .single()

  if (error) {
    console.error('[Documents] Create error:', error.message)
    return res.status(500).json({ message: 'No se pudo guardar el documento.' })
  }

  return res.status(201).json(data)
}

export async function listMyDocuments(req, res) {
  const { data, error } = await supabaseAdmin
    .from('documents')
    .select('id, tipo_doc, expiry_date, active, created_at, updated_at')
    .eq('user_id', req.user.id)
    .order('expiry_date', { ascending: true })

  if (error) {
    console.error('[Documents] List error:', error.message)
    return res.status(500).json({ message: 'No se pudieron cargar los documentos.' })
  }

  return res.json(data || [])
}

export async function updateDocument(req, res) {
  const { id } = req.params
  const { expiry_date, active } = req.body

  const updates = { updated_at: new Date().toISOString() }

  if (expiry_date !== undefined) {
    if (!isValidDate(expiry_date)) {
      return res.status(400).json({ message: 'La fecha debe estar en formato YYYY-MM-DD.' })
    }

    updates.expiry_date = expiry_date
  }

  if (active !== undefined) {
    if (typeof active !== 'boolean') {
      return res.status(400).json({ message: 'El campo active debe ser booleano.' })
    }

    updates.active = active
  }

  if (!updates.expiry_date && updates.active === undefined) {
    return res.status(400).json({ message: 'Debes enviar expiry_date o active para actualizar.' })
  }

  const { data, error } = await supabaseAdmin
    .from('documents')
    .update(updates)
    .eq('id', id)
    .eq('user_id', req.user.id)
    .select()
    .maybeSingle()

  if (error) {
    console.error('[Documents] Update error:', error.message)
    return res.status(500).json({ message: 'No se pudo actualizar el documento.' })
  }

  if (!data) {
    return res.status(404).json({ message: 'Documento no encontrado.' })
  }

  return res.json(data)
}

export async function deleteDocument(req, res) {
  const { id } = req.params

  const { data, error } = await supabaseAdmin
    .from('documents')
    .delete()
    .eq('id', id)
    .eq('user_id', req.user.id)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('[Documents] Delete error:', error.message)
    return res.status(500).json({ message: 'No se pudo eliminar el documento.' })
  }

  if (!data) {
    return res.status(404).json({ message: 'Documento no encontrado.' })
  }

  return res.status(204).send()
}

export async function sendTestReminderEmail(req, res) {
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
}

