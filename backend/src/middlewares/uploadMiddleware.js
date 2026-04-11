import multer from 'multer'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

const storage = multer.memoryStorage()

function fileFilter(_req, file, callback) {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    callback(null, true)
  } else {
    callback(
      new Error('Tipo de archivo no permitido. Solo se aceptan JPG, PNG y WEBP.'),
      false,
    )
  }
}

export const uploadSingle = multer({
  storage,
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter,
}).single('image')

export function handleUploadErrors(err, _req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'La imagen supera el limite de 5 MB.' })
    }
    return res.status(400).json({ message: err.message })
  }

  if (err) {
    return res.status(400).json({ message: err.message })
  }

  return next()
}
