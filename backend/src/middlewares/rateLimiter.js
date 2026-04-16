/**
 * Technical overview:
 * - Layer: middleware
 * - Responsibility: enforce per-route rate limits
 * - Policy: general, auth, and OCR-specific throttling
 */

import rateLimit from 'express-rate-limit'

const TOO_MANY = { message: 'Demasiadas solicitudes. Intenta de nuevo mas tarde.' }

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: TOO_MANY,
})

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiados intentos de autenticacion. Intenta de nuevo mas tarde.' },
})

export const ocrLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Limite de procesamiento de imagenes alcanzado. Intenta en una hora.' },
})

