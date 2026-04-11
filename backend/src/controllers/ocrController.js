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
    console.error('[OCR] Vision API error:', error.message)
    return res.status(502).json({
      message: 'El servicio de reconocimiento de texto no esta disponible. Intenta mas tarde.',
    })
  }
}
