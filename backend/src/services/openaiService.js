/**
 * Technical overview:
 * - Layer: service
 * - Responsibility: fallback AI extraction of expiry date from OCR text
 * - Behavior: strict YYYY-MM-DD normalization or null
 */

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'

export async function extractDateWithAI(text, tipoDoc = '') {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey || apiKey === 'YOUR_OPENAI_API_KEY') {
    return null
  }

  const prompt =
    'Extract ONLY the document expiry date (fecha de vigencia / vencimiento / caducidad).\n' +
    'Document type: ' + (tipoDoc || 'unknown') + '\n' +
    'NEVER return date of birth (fecha de nacimiento / DOB), issue date, or registration date.\n' +
    'If text contains a validity range like 2023-2033, return the final date as 2033-12-31.\n' +
    'Reply with ONLY one date in YYYY-MM-DD format.\n' +
    'If expiry date is not present with reasonable confidence, reply with NULL.\n' +
    'Do not add explanations.\n\n' +
    `Document text:\n${text.slice(0, 2500)}`

  try {
    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        max_tokens: 20,
      }),
    })

    if (!response.ok) return null

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content?.trim() ?? ''

    if (!reply || reply.toUpperCase() === 'NULL') return null

    // Validate strict YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(reply)) {
      const [y, m, d] = reply.split('-').map(Number)
      const date = new Date(y, m - 1, d)
      if (!isNaN(date.getTime())) return reply
    }

    return null
  } catch {
    return null
  }
}

