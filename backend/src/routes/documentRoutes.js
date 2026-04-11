import { Router } from 'express'
import {
  deleteDocument,
  createDocument,
  extractDocumentDate,
  listMyDocuments,
  updateDocument,
} from '../controllers/documentController.js'
import { requireAuth } from '../middlewares/authMiddleware.js'

const router = Router()

router.post('/extract', requireAuth, extractDocumentDate)
router.get('/', requireAuth, listMyDocuments)
router.post('/', requireAuth, createDocument)
router.patch('/:id', requireAuth, updateDocument)
router.delete('/:id', requireAuth, deleteDocument)

export default router
