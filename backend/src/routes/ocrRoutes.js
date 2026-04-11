import { Router } from 'express'
import { processOcr } from '../controllers/ocrController.js'
import { requireAuth } from '../middlewares/authMiddleware.js'
import { handleUploadErrors, uploadSingle } from '../middlewares/uploadMiddleware.js'

const router = Router()

router.post('/', requireAuth, uploadSingle, handleUploadErrors, processOcr)

export default router
