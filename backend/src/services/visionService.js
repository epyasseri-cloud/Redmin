/**
 * Technical overview:
 * - Layer: service
 * - Responsibility: OCR provider abstraction (Azure Vision / Google Vision / Tesseract)
 * - Deployment: prefer cloud OCR in Vercel to avoid serverless timeout
 */

import { createWorker } from 'tesseract.js'

const VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate'
const AZURE_READ_API_VERSION = 'v3.2'
const AZURE_READ_STATUS_RETRY_DELAY_MS = 800
const AZURE_READ_STATUS_MAX_ATTEMPTS = 8
const workerPromises = new Map()

function getOcrProvider() {
  // Tesseract local OCR is not viable in serverless environments (timeout + missing traineddata)
  if (process.env.VERCEL === '1') {
    if (hasAzureVisionConfig()) {
      return 'azure'
    }

    return hasGoogleVisionConfig() ? 'google' : 'local'
  }

  const provider = (process.env.OCR_PROVIDER || 'auto').toLowerCase()
  return ['auto', 'local', 'google', 'azure'].includes(provider) ? provider : 'auto'
}

function hasGoogleVisionConfig() {
  const apiKey = process.env.GOOGLE_VISION_API_KEY
  return Boolean(apiKey && !apiKey.startsWith('YOUR_'))
}

function hasAzureVisionConfig() {
  const endpoint = process.env.AZURE_VISION_ENDPOINT
  const apiKey = process.env.AZURE_VISION_KEY

  return Boolean(
    endpoint &&
      apiKey &&
      !String(endpoint).includes('YOUR_') &&
      !String(apiKey).startsWith('YOUR_')
  )
}

function getAzureReadUrl() {
  const endpoint = String(process.env.AZURE_VISION_ENDPOINT || '').trim().replace(/\/+$/, '')

  if (!endpoint) {
    throw new Error('AZURE_VISION_CONFIG_MISSING')
  }

  return `${endpoint}/vision/${AZURE_READ_API_VERSION}/read/analyze`
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
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

function extractAzureReadText(result) {
  const pages = result?.analyzeResult?.readResults || []
  const lines = pages.flatMap((page) => page?.lines || [])

  return lines
    .map((line) => line?.text?.trim())
    .filter(Boolean)
    .join('\n')
    .trim()
}

async function pollAzureReadResult(operationLocation, apiKey) {
  for (let attempt = 0; attempt < AZURE_READ_STATUS_MAX_ATTEMPTS; attempt += 1) {
    if (attempt > 0) {
      await delay(AZURE_READ_STATUS_RETRY_DELAY_MS)
    }

    const response = await fetch(operationLocation, {
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
      },
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      const message =
        data?.error?.message || `Azure Vision responded with status ${response.status}`
      throw new Error(`AZURE_VISION_ERROR: ${message}`)
    }

    const status = String(data?.status || '').toLowerCase()

    if (status === 'succeeded') {
      return extractAzureReadText(data)
    }

    if (status === 'failed') {
      const message = data?.error?.message || 'Azure Vision could not process the image.'
      throw new Error(`AZURE_VISION_ERROR: ${message}`)
    }
  }

  throw new Error('AZURE_VISION_ERROR: Azure Vision OCR timed out while waiting for the analysis result.')
}

async function extractTextWithAzureVision(imageBuffer) {
  const apiKey = process.env.AZURE_VISION_KEY

  if (!hasAzureVisionConfig()) {
    throw new Error('AZURE_VISION_CONFIG_MISSING')
  }

  const response = await fetch(getAzureReadUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Ocp-Apim-Subscription-Key': apiKey,
    },
    body: imageBuffer,
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    const message =
      errorBody?.error?.message || `Azure Vision responded with status ${response.status}`
    throw new Error(`AZURE_VISION_ERROR: ${message}`)
  }

  const operationLocation = response.headers.get('operation-location')

  if (!operationLocation) {
    throw new Error('AZURE_VISION_ERROR: Missing operation-location header from Azure Vision.')
  }

  return pollAzureReadResult(operationLocation, apiKey)
}

function createProviderTask(provider, promiseFactory) {
  return promiseFactory().then((text) => {
    if (!text) {
      throw new Error(`${provider.toUpperCase()}_OCR_EMPTY`)
    }

    return { provider, text }
  })
}

async function raceProviders(imageBuffer) {
  const tasks = [createProviderTask('local', () => extractTextWithLocalOcr(imageBuffer))]

  if (hasAzureVisionConfig()) {
    tasks.push(createProviderTask('azure', () => extractTextWithAzureVision(imageBuffer)))
  }

  if (hasGoogleVisionConfig()) {
    tasks.push(createProviderTask('google', () => extractTextWithGoogleVision(imageBuffer)))
  }

  try {
    const winner = await Promise.any(tasks)
    return winner.text
  } catch {
    const settled = await Promise.allSettled(tasks)
    const firstCloudError = settled.find(
      (result) =>
        result.status === 'rejected' &&
        !result.reason?.message?.includes('LOCAL_OCR_ERROR') &&
        !result.reason?.message?.includes('_OCR_EMPTY')
    )

    if (firstCloudError?.status === 'rejected') {
      throw firstCloudError.reason
    }

    const localError = settled.find(
      (result) => result.status === 'rejected' && result.reason?.message?.includes('LOCAL_OCR_ERROR')
    )

    if (localError?.status === 'rejected') {
      throw localError.reason
    }
  }

  throw new Error('LOCAL_OCR_ERROR: No OCR provider available')
}

export async function extractTextFromImage(imageBuffer) {
  const provider = getOcrProvider()

  if (provider === 'local') {
    return extractTextWithLocalOcr(imageBuffer)
  }

  if (provider === 'google') {
    return extractTextWithGoogleVision(imageBuffer)
  }

  if (provider === 'azure') {
    return extractTextWithAzureVision(imageBuffer)
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

