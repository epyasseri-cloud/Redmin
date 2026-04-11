import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import UploadDocument from '../components/documents/UploadDocument.jsx'
import { useAuth } from '../hooks/useAuth.jsx'
import { extractExpiryDate, saveDocument, uploadImageForOcr } from '../services/api.js'

const DOCUMENT_TYPES = [
  { value: 'dni_espanol', label: 'DNI / NIE español' },
  { value: 'pasaporte', label: 'Pasaporte' },
  { value: 'licencia_conducir', label: 'Licencia de conducir' },
  { value: 'tarjeta_residencia', label: 'Tarjeta de residencia' },
  { value: 'seguro', label: 'Seguro / Poliza' },
  { value: 'otro', label: 'Otro documento' },
]

const METHOD_LABELS = {
  regex: 'Extraido automaticamente',
  openai: 'Extraido con inteligencia artificial',
  manual: 'Introduce la fecha manualmente',
}

function NewDocument() {
  const navigate = useNavigate()
  const { session } = useAuth()

  const [tipoDoc, setTipoDoc] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)

  const [extractedText, setExtractedText] = useState('')
  const [isOcrProcessing, setIsOcrProcessing] = useState(false)
  const [ocrError, setOcrError] = useState('')
  const [ocrDone, setOcrDone] = useState(false)

  const [expiryDate, setExpiryDate] = useState('')
  const [extractionMethod, setExtractionMethod] = useState(null)
  const [isExtractingDate, setIsExtractingDate] = useState(false)
  const [dateError, setDateError] = useState('')
  const [dateDone, setDateDone] = useState(false)

  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  function handleFileSelected(file) {
    setSelectedFile(file)
    setExtractedText('')
    setOcrError('')
    setOcrDone(false)
    setExpiryDate('')
    setExtractionMethod(null)
    setDateDone(false)
    setDateError('')
    setSaveError('')
  }

  async function handleProcessOcr() {
    if (!selectedFile || !tipoDoc) return

    setIsOcrProcessing(true)
    setOcrError('')
    setExtractedText('')
    setOcrDone(false)
    setDateDone(false)
    setExpiryDate('')
    setExtractionMethod(null)

    try {
      const result = await uploadImageForOcr(selectedFile, session?.access_token)
      const text = result.text || ''
      setExtractedText(text)
      setOcrDone(true)

      // Auto-trigger date extraction after OCR
      if (text) {
        await runDateExtraction(text)
      }
    } catch (error) {
      setOcrError(error.message || 'No fue posible procesar la imagen.')
    } finally {
      setIsOcrProcessing(false)
    }
  }

  async function runDateExtraction(text) {
    setIsExtractingDate(true)
    setDateError('')
    setDateDone(false)

    try {
      const result = await extractExpiryDate(text, tipoDoc, session?.access_token)
      setExpiryDate(result.expiry_date || '')
      setExtractionMethod(result.method)
      setDateDone(true)
    } catch {
      setExtractionMethod('manual')
      setDateDone(true)
    } finally {
      setIsExtractingDate(false)
    }
  }

  async function handleSave() {
    setSaveError('')

    if (!expiryDate) {
      setSaveError('Introduce una fecha de caducidad antes de guardar.')
      return
    }

    setIsSaving(true)

    try {
      await saveDocument(tipoDoc, expiryDate, session?.access_token)
      navigate('/dashboard')
    } catch (error) {
      setSaveError(error.message || 'No se pudo guardar el documento.')
    } finally {
      setIsSaving(false)
    }
  }

  const canExtract = tipoDoc && selectedFile && !isOcrProcessing
  const showDateSection = ocrDone && !isOcrProcessing
  const showSaveSection = dateDone && !isExtractingDate

  return (
    <main className="app-container">
      <section className="ocr-card">
        <div className="ocr-card-header">
          <Link className="back-link" to="/dashboard">
            <i className="bi bi-arrow-left" aria-hidden="true" />
            Volver al dashboard
          </Link>
          <h1>Nuevo documento</h1>
          <p>
            Selecciona el tipo de documento, sube la imagen y el sistema extraera la fecha
            de caducidad automaticamente.
          </p>
        </div>

        {/* Paso 1: Tipo de documento */}
        <div className="step-section">
          <h2 className="col-title">
            <span className="step-badge">1</span>
            Tipo de documento
          </h2>
          <select
            className="tipo-select"
            value={tipoDoc}
            onChange={(e) => setTipoDoc(e.target.value)}
            aria-label="Tipo de documento"
          >
            <option value="">Selecciona un tipo...</option>
            {DOCUMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Paso 2: Subir imagen y OCR */}
        {tipoDoc ? (
          <div className="ocr-layout">
            <div className="ocr-upload-col">
              <h2 className="col-title">
                <span className="step-badge">2</span>
                Imagen del documento
              </h2>
              <UploadDocument onFileSelected={handleFileSelected} />

              {canExtract ? (
                <button
                  className="button button-primary button-block"
                  type="button"
                  onClick={handleProcessOcr}
                >
                  <i className="bi bi-scan" aria-hidden="true" />
                  Extraer texto
                </button>
              ) : null}

              {isOcrProcessing ? (
                <div className="ocr-processing">
                  <span className="spinner" aria-hidden="true" />
                  Procesando imagen...
                </div>
              ) : null}
            </div>

            <div className="ocr-result-col">
              <h2 className="col-title">
                <span className="step-badge">3</span>
                Texto reconocido
              </h2>

              {ocrError ? (
                <div className="alert alert-error" role="alert">
                  {ocrError}
                </div>
              ) : null}

              {ocrDone && !extractedText ? (
                <div className="alert alert-error" role="alert">
                  No se encontro texto. Intenta con una foto mas clara o mejor iluminada.
                </div>
              ) : null}

              <textarea
                className="ocr-textarea"
                value={extractedText}
                onChange={(e) => setExtractedText(e.target.value)}
                placeholder="El texto reconocido aparecera aqui. Puedes editarlo si hay errores."
                rows={10}
                aria-label="Texto extraido del documento"
              />

              {ocrDone && extractedText && !isExtractingDate ? (
                <button
                  className="button button-outline"
                  type="button"
                  onClick={() => runDateExtraction(extractedText)}
                >
                  <i className="bi bi-calendar-search" aria-hidden="true" />
                  Volver a extraer fecha
                </button>
              ) : null}

              {isExtractingDate ? (
                <div className="ocr-processing">
                  <span className="spinner" aria-hidden="true" />
                  Buscando fecha de caducidad...
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Paso 4: Confirmar fecha y guardar */}
        {showDateSection ? (
          <div className="date-confirm-section">
            <h2 className="col-title">
              <span className="step-badge">4</span>
              Fecha de caducidad
            </h2>

            {extractionMethod ? (
              <span className={`method-badge method-${extractionMethod}`}>
                <i
                  className={`bi ${
                    extractionMethod === 'regex'
                      ? 'bi-check-circle'
                      : extractionMethod === 'openai'
                      ? 'bi-stars'
                      : 'bi-pencil'
                  }`}
                  aria-hidden="true"
                />
                {METHOD_LABELS[extractionMethod] || extractionMethod}
              </span>
            ) : null}

            <div className="date-input-row">
              <input
                className="date-input"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                aria-label="Fecha de caducidad"
              />
            </div>

            {dateError ? (
              <div className="alert alert-error" role="alert">
                {dateError}
              </div>
            ) : null}

            {showSaveSection ? (
              <>
                {saveError ? (
                  <div className="alert alert-error" role="alert">
                    {saveError}
                  </div>
                ) : null}
                <div className="button-row">
                  <button
                    className="button button-primary"
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    <i className="bi bi-floppy" aria-hidden="true" />
                    {isSaving ? 'Guardando...' : 'Guardar documento'}
                  </button>
                  <Link className="button button-outline" to="/dashboard">
                    Cancelar
                  </Link>
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  )
}

export default NewDocument
