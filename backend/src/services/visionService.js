import { createWorker } from 'tesseract.js'

const VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate'
let workerPromise = null

function getOcrProvider() {
  return (process.env.OCR_PROVIDER || 'auto').toLowerCase()
}

function hasGoogleVisionConfig() {
  const apiKey = process.env.GOOGLE_VISION_API_KEY
  return Boolean(apiKey && !apiKey.startsWith('YOUR_'))
}

async function getWorker() {
  if (!workerPromise) {
    const lang = process.env.OCR_LANG || 'spa+eng'
    workerPromise = createWorker(lang)
  }

  return workerPromise
}

async function extractTextWithLocalOcr(imageBuffer) {
  try {
    const worker = await getWorker()
    const result = await worker.recognize(imageBuffer)
    return (result?.data?.text || '').trim()
  } catch (error) {
    throw new Error(`LOCAL_OCR_ERROR: ${error.message}`)
  }
}

async function extractTextWithGoogleVision(imageBuffer) {
  const base64Image = imageBuffer.toString('base64')
  const apiKey = process.env.GOOGLE_VISION_API_KEY

  if (!hasGoogleVisionConfig()) {
    throw new Error('VISION_CONFIG_MISSING')
  }

  const requestBody = {
    requests: [
      {
        image: { content: base64Image },
        features: [{ type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }],
      },
    ],
  }

  const response = await fetch(`${VISION_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    const message =
      errorBody?.error?.message || `Vision API responded with status ${response.status}`
    throw new Error(`VISION_API_ERROR: ${message}`)
  }

  const data = await response.json()
  const annotation = data.responses?.[0]

  if (annotation?.error) {
    throw new Error(`VISION_API_ERROR: ${annotation.error.message || 'Vision API returned an error.'}`)
  }

  const fullText = annotation?.fullTextAnnotation?.text || ''
  return fullText.trim()
}

export async function extractTextFromImage(imageBuffer) {
  const provider = getOcrProvider()

  if (provider === 'local') {
    return extractTextWithLocalOcr(imageBuffer)
  }

  if (provider === 'google') {
    return extractTextWithGoogleVision(imageBuffer)
  }

  // auto mode: prefer Google if configured; fallback to local OCR on provider/config errors
  if (hasGoogleVisionConfig()) {
    try {
      return await extractTextWithGoogleVision(imageBuffer)
    } catch (error) {
      console.warn('[OCR] Google Vision no disponible, usando OCR local:', error.message)
    }
  }

  return extractTextWithLocalOcr(imageBuffer)
}

process.on('exit', async () => {
  if (workerPromise) {
    try {
      const worker = await workerPromise
      await worker.terminate()
    } catch {
      // ignore shutdown cleanup errors
    }
  }
})
