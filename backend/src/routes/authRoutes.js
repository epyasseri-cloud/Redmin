/**
 * Technical overview:
 * - Layer: router
 * - Responsibility: map auth/session endpoints to controllers
 * - Security: protected by requireAuth middleware
 */

import { Router } from 'express'
import { getAuthenticatedProfile } from '../controllers/authController.js'
import { requireAuth } from '../middlewares/authMiddleware.js'

const router = Router()

router.get('/me', requireAuth, getAuthenticatedProfile)

export default router
