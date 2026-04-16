/**
 * Technical overview:
 * - Layer: controller
 * - Responsibility: orchestrate OCR request/response lifecycle
 * - Behavior: translate provider errors into user-safe HTTP messages
 */

import { extractTextFromImage } from '../services/visionService.js'

export async function processOcr(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: 'No se recibio ninguna imagen.' })
  }

  try {
    const extractedText = await extractTextFromImage(req.file.buffer)

    if (!extractedText) {
      return res.status(422).json({
        message:
          'No se pudo extraer texto de la imagen. Asegurate de que la imagen sea clara y legible.',
        text: '',
      })
    }

    return res.json({ text: extractedText })
  } catch (error) {
    console.error('[OCR] OCR processing error:', error.message)

    if (error.message.includes('AZURE_VISION_CONFIG_MISSING')) {
      return res.status(503).json({
        message: 'Falta configurar AZURE_VISION_ENDPOINT y AZURE_VISION_KEY en el backend.',
      })
    }

    if (error.message.includes('VISION_CONFIG_MISSING')) {
      return res.status(503).json({
        message: 'Falta configurar GOOGLE_VISION_API_KEY en el backend.',
      })
    }

    if (
      error.message.includes('AZURE_VISION_ERROR') &&
      /access denied|invalid|subscription|unauthorized|forbidden/i.test(error.message)
    ) {
      return res.status(503).json({
        message: 'La configuracion de Azure Vision es invalida o no tiene permisos suficientes.',
      })
    }

    if (error.message.includes('API key not valid')) {
      return res.status(503).json({
        message: 'La clave de Google Vision es invalida. Genera una API key valida en Google Cloud.',
      })
    }

    if (error.message.includes('LOCAL_OCR_ERROR')) {
      return res.status(422).json({
        message:
          'No se pudo leer el texto de esta imagen. Intenta con una foto mas clara o usa el modo manual para capturar la fecha.',
      })
    }

    return res.status(503).json({
      message: 'El servicio de reconocimiento de texto no esta disponible. Intenta mas tarde.',
    })
  }
}

