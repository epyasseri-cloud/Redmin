const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

async function apiRequest(path, options = {}) {
  const { accessToken, body, headers, ...rest } = options
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(payload.message || 'Request failed')
  }

  return response.json()
}

export async function fetchMyProfile(accessToken) {
  return apiRequest('/api/auth/me', { method: 'GET', accessToken })
}

export async function extractExpiryDate(text, tipoDoc, accessToken) {
  return apiRequest('/api/documents/extract', {
    method: 'POST',
    accessToken,
    body: { text, tipo_doc: tipoDoc },
  })
}

export async function saveDocument(tipoDoc, expiryDate, accessToken) {
  return apiRequest('/api/documents', {
    method: 'POST',
    accessToken,
    body: { tipo_doc: tipoDoc, expiry_date: expiryDate },
  })
}

export async function updateDocumentDate(id, expiryDate, accessToken) {
  return apiRequest(`/api/documents/${id}`, {
    method: 'PATCH',
    accessToken,
    body: { expiry_date: expiryDate },
  })
}

export async function uploadImageForOcr(imageFile, accessToken) {
  const formData = new FormData()
  formData.append('image', imageFile)

  const response = await fetch(`${API_BASE_URL}/api/ocr`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: 'Error al procesar la imagen.' }))
    throw new Error(payload.message || 'Error al procesar la imagen.')
  }

  return response.json()
}