import { extractExpiryDate } from '../utils/regexExtractor.js'
import { extractDateWithAI } from '../services/openaiService.js'
import { supabaseAdmin } from '../utils/supabaseClient.js'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function extractDocumentDate(req, res) {
  const { text, tipo_doc } = req.body

  if (!text || !tipo_doc) {
    return res.status(400).json({ message: 'Se requieren los campos text y tipo_doc.' })
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

  if (!DATE_RE.test(expiry_date)) {
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

export async function updateDocumentExpiry(req, res) {
  const { id } = req.params
  const { expiry_date } = req.body

  if (!expiry_date || !DATE_RE.test(expiry_date)) {
    return res.status(400).json({ message: 'La fecha debe estar en formato YYYY-MM-DD.' })
  }

  const { data, error } = await supabaseAdmin
    .from('documents')
    .update({ expiry_date, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', req.user.id)
    .select()
    .single()

  if (error) {
    console.error('[Documents] Update error:', error.message)
    return res.status(500).json({ message: 'No se pudo actualizar el documento.' })
  }

  if (!data) {
    return res.status(404).json({ message: 'Documento no encontrado.' })
  }

  return res.json(data)
}
