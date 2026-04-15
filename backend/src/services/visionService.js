import { createWorker } from 'tesseract.js'

const VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate'
const workerPromises = new Map()

function getOcrProvider() {
  return (process.env.OCR_PROVIDER || 'auto').toLowerCase()
}

function hasGoogleVisionConfig() {
  const apiKey = process.env.GOOGLE_VISION_API_KEY
  return Boolean(apiKey && !apiKey.startsWith('YOUR_'))
}

function getPreferredLocalLanguage() {
  const lang = process.env.OCR_LANG || 'spa+eng'
  return lang.trim() || 'spa+eng'
}

async function getWorker(lang) {
  if (!workerPromises.has(lang)) {
    workerPromises.set(lang, createWorker(lang))
  }

  return workerPromises.get(lang)
}

async function recognizeWithWorker(imageBuffer, lang) {
  const worker = await getWorker(lang)
  const result = await worker.recognize(imageBuffer)
  return (result?.data?.text || '').trim()
}

async function extractTextWithLocalOcr(imageBuffer) {
  const preferredLang = getPreferredLocalLanguage()

  try {
    return await recognizeWithWorker(imageBuffer, preferredLang)
  } catch (error) {
    const canFallbackToEnglish = preferredLang !== 'eng' && preferredLang.includes('+')

    if (canFallbackToEnglish) {
      try {
        return await recognizeWithWorker(imageBuffer, 'eng')
      } catch (fallbackError) {
        throw new Error(`LOCAL_OCR_ERROR: ${fallbackError.message}`)
      }
    }

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

async function raceProviders(imageBuffer) {
  const localTask = extractTextWithLocalOcr(imageBuffer)
    .then((text) => ({ ok: true, text, provider: 'local' }))
    .catch((error) => ({ ok: false, error, provider: 'local' }))

  const googleTask = hasGoogleVisionConfig()
    ? extractTextWithGoogleVision(imageBuffer)
        .then((text) => ({ ok: true, text, provider: 'google' }))
        .catch((error) => ({ ok: false, error, provider: 'google' }))
    : Promise.resolve({ ok: false, error: new Error('VISION_CONFIG_MISSING'), provider: 'google' })

  // Academic rubric: race two OCR providers and keep the first response.
  const first = await Promise.race([googleTask, localTask])
  if (first.ok && first.text) return first.text

  const second = first.provider === 'google' ? await localTask : await googleTask
  if (second.ok && second.text) return second.text

  const error = second.error || first.error || new Error('No OCR provider available')
  if (error.message.includes('LOCAL_OCR_ERROR')) {
    throw error
  }
  throw new Error(`LOCAL_OCR_ERROR: ${error.message}`)
}

export async function extractTextFromImage(imageBuffer) {
  const provider = getOcrProvider()

  if (provider === 'local') {
    return extractTextWithLocalOcr(imageBuffer)
  }

  if (provider === 'google') {
    return extractTextWithGoogleVision(imageBuffer)
  }

  return raceProviders(imageBuffer)
}

process.on('exit', async () => {
  for (const workerPromise of workerPromises.values()) {
    try {
      const worker = await workerPromise
      await worker.terminate()
    } catch {
      // ignore shutdown cleanup errors
    }
  }
})
