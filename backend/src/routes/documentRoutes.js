import { Router } from 'express'
import {
  createDocument,
  extractDocumentDate,
  updateDocumentExpiry,
} from '../controllers/documentController.js'
import { requireAuth } from '../middlewares/authMiddleware.js'

const router = Router()

router.post('/extract', requireAuth, extractDocumentDate)
router.post('/', requireAuth, createDocument)
router.patch('/:id', requireAuth, updateDocumentExpiry)

export default router
