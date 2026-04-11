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

    if (error.message.includes('VISION_CONFIG_MISSING')) {
      return res.status(500).json({
        message: 'Falta configurar GOOGLE_VISION_API_KEY en el backend.',
      })
    }

    if (error.message.includes('API key not valid')) {
      return res.status(502).json({
        message: 'La clave de Google Vision es invalida. Genera una API key valida en Google Cloud.',
      })
    }

    if (error.message.includes('LOCAL_OCR_ERROR')) {
      return res.status(502).json({
        message: 'No se pudo procesar OCR localmente. Verifica instalacion y recursos del servidor.',
      })
    }

    return res.status(502).json({
      message: 'El servicio de reconocimiento de texto no esta disponible. Intenta mas tarde.',
    })
  }
}
