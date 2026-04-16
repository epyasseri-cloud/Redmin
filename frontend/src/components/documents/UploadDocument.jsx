/**
 * Technical overview:
 * - Layer: component
 * - Responsibility: upload image and request OCR extraction
 * - Pipeline: file validation -> OCR API -> extracted text callback
 */

import { useRef, useState } from 'react'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024

function UploadDocument({ onFileSelected }) {
  const inputRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [validationError, setValidationError] = useState('')

  function validateAndSet(file) {
    setValidationError('')
    setPreview(null)

    if (!file) return

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setValidationError('Solo se aceptan archivos JPG, PNG o WEBP.')
      return
    }

    if (file.size > MAX_BYTES) {
      setValidationError('La imagen no puede superar 5 MB.')
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    onFileSelected(file)
  }

  function handleInputChange(event) {
    validateAndSet(event.target.files?.[0] ?? null)
  }

  function handleDrop(event) {
    event.preventDefault()
    setDragOver(false)
    validateAndSet(event.dataTransfer.files?.[0] ?? null)
  }

  function handleDragOver(event) {
    event.preventDefault()
    setDragOver(true)
  }

  function handleDragLeave() {
    setDragOver(false)
  }

  function handleClick() {
    inputRef.current?.click()
  }

  return (
    <div className="upload-area-wrapper">
      <div
        className={`upload-dropzone${dragOver ? ' drag-over' : ''}`}
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        aria-label="Zona para subir imagen del documento"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          className="upload-input-hidden"
          onChange={handleInputChange}
          aria-hidden="true"
        />

        {preview ? (
          <img src={preview} alt="Vista previa del documento" className="upload-preview" />
        ) : (
          <div className="upload-placeholder">
            <i className="bi bi-cloud-arrow-up upload-icon" aria-hidden="true" />
            <p>Arrastra una imagen aqui o haz clic para seleccionar</p>
            <span>JPG, PNG o WEBP - maximo 5 MB</span>
          </div>
        )}
      </div>

      {validationError ? (
        <div className="alert alert-error" role="alert">
          {validationError}
        </div>
      ) : null}

      {preview ? (
        <button
          className="button button-outline"
          type="button"
          onClick={handleClick}
        >
          <i className="bi bi-arrow-repeat" aria-hidden="true" />
          Cambiar imagen
        </button>
      ) : null}
    </div>
  )
}

export default UploadDocument

