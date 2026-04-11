import { useState } from 'react'
import { Link } from 'react-router-dom'
import UploadDocument from '../components/documents/UploadDocument.jsx'
import { useAuth } from '../hooks/useAuth.jsx'
import { uploadImageForOcr } from '../services/api.js'

function NewDocument() {
  const { session } = useAuth()

  const [selectedFile, setSelectedFile] = useState(null)
  const [extractedText, setExtractedText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [ocrError, setOcrError] = useState('')
  const [ocrDone, setOcrDone] = useState(false)

  function handleFileSelected(file) {
    setSelectedFile(file)
    setExtractedText('')
    setOcrError('')
    setOcrDone(false)
  }

  async function handleProcessOcr() {
    if (!selectedFile) return

    setIsProcessing(true)
    setOcrError('')
    setExtractedText('')
    setOcrDone(false)

    try {
      const accessToken = session?.access_token
      const result = await uploadImageForOcr(selectedFile, accessToken)
      setExtractedText(result.text || '')
      setOcrDone(true)
    } catch (error) {
      setOcrError(error.message || 'No fue posible procesar la imagen.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <main className="app-container">
      <section className="ocr-card">
        <div className="ocr-card-header">
          <Link className="back-link" to="/dashboard">
            <i className="bi bi-arrow-left" aria-hidden="true" />
            Volver al dashboard
          </Link>
          <h1>Subir documento</h1>
          <p>
            Sube una foto clara del documento. El sistema extraera el texto automaticamente usando
            reconocimiento optico de caracteres.
          </p>
        </div>

        <div className="ocr-layout">
          <div className="ocr-upload-col">
            <h2 className="col-title">Imagen del documento</h2>
            <UploadDocument onFileSelected={handleFileSelected} />

            {selectedFile && !isProcessing ? (
              <button
                className="button button-primary button-block"
                type="button"
                onClick={handleProcessOcr}
              >
                <i className="bi bi-scan" aria-hidden="true" />
                Extraer texto
              </button>
            ) : null}

            {isProcessing ? (
              <div className="ocr-processing">
                <span className="spinner" aria-hidden="true" />
                Procesando imagen...
              </div>
            ) : null}
          </div>

          <div className="ocr-result-col">
            <h2 className="col-title">Texto extraido</h2>

            {ocrError ? (
              <div className="alert alert-error" role="alert">
                {ocrError}
              </div>
            ) : null}

            {ocrDone && !extractedText ? (
              <div className="alert alert-error" role="alert">
                No se encontro texto en la imagen. Intenta con una foto mas clara o con mejor
                iluminacion.
              </div>
            ) : null}

            <textarea
              className="ocr-textarea"
              value={extractedText}
              onChange={(e) => setExtractedText(e.target.value)}
              placeholder="El texto reconocido aparecera aqui. Puedes editarlo si hay errores."
              rows={14}
              aria-label="Texto extraido del documento"
            />

            {ocrDone && extractedText ? (
              <p className="ocr-hint">
                <i className="bi bi-info-circle" aria-hidden="true" />
                Revisa el texto y en el siguiente modulo podras confirmar la fecha de caducidad.
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  )
}

export default NewDocument
