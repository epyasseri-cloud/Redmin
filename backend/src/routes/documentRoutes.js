import { Router } from 'express'
import {
  deleteDocument,
  createDocument,
  extractDocumentDate,
  listMyDocuments,
  sendTestReminderEmail,
  updateDocument,
} from '../controllers/documentController.js'
import { requireAuth } from '../middlewares/authMiddleware.js'
import { validateId } from '../middlewares/validateId.js'

const router = Router()

router.post('/extract', requireAuth, extractDocumentDate)
router.post('/test-email', requireAuth, sendTestReminderEmail)
router.get('/', requireAuth, listMyDocuments)
router.post('/', requireAuth, createDocument)
router.patch('/:id', requireAuth, validateId, updateDocument)
router.delete('/:id', requireAuth, validateId, deleteDocument)

export default router
