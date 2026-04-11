const VISION_API_URL =
  'https://vision.googleapis.com/v1/images:annotate'

export async function extractTextFromImage(imageBuffer) {
  const base64Image = imageBuffer.toString('base64')
  const apiKey = process.env.GOOGLE_VISION_API_KEY

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
    throw new Error(message)
  }

  const data = await response.json()
  const annotation = data.responses?.[0]

  if (annotation?.error) {
    throw new Error(annotation.error.message || 'Vision API returned an error.')
  }

  const fullText = annotation?.fullTextAnnotation?.text || ''
  return fullText.trim()
}
