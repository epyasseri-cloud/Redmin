import { extractExpiryDate } from '../utils/regexExtractor.js'
import { extractDateWithAI } from '../services/openaiService.js'
import { supabaseAdmin } from '../utils/supabaseClient.js'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MAX_OCR_TEXT_LENGTH = 10_000
const ALLOWED_TIPOS = new Set([
  'dni_espanol',
  'pasaporte',
  'licencia_conducir',
  'tarjeta_residencia',
  'seguro',
  'otro',
])

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

  if (!expiryDate) {
    expiryDate = await extractDateWithAI(text)
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
