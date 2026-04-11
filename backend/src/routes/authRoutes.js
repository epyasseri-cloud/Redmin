import { Router } from 'express'
import { getAuthenticatedProfile } from '../controllers/authController.js'
import { requireAuth } from '../middlewares/authMiddleware.js'

const router = Router()

router.get('/me', requireAuth, getAuthenticatedProfile)

export default router