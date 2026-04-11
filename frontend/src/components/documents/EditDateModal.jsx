import { useEffect, useState } from 'react'

function EditDateModal({ document, isSaving, error, onClose, onSave }) {
  const [dateValue, setDateValue] = useState('')

  useEffect(() => {
    setDateValue(document?.expiry_date || '')
  }, [document])

  if (!document) return null

  function handleSubmit(event) {
    event.preventDefault()
    onSave(document.id, dateValue)
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="edit-date-title">
      <div className="modal-card">
        <div className="modal-header">
          <h2 id="edit-date-title">Editar fecha de caducidad</h2>
          <button className="icon-button" type="button" onClick={onClose}>
            <i className="bi bi-x-lg" aria-hidden="true" />
            Cerrar
          </button>
        </div>

        <p className="modal-text">Documento: {document.tipo_doc}</p>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label htmlFor="expiry-date-input">Nueva fecha</label>
          <input
            id="expiry-date-input"
            className="date-input"
            type="date"
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
            required
          />

          {error ? (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          ) : null}

          <div className="button-row">
            <button className="button button-primary" type="submit" disabled={isSaving}>
              <i className="bi bi-save" aria-hidden="true" />
              {isSaving ? 'Guardando...' : 'Guardar'}
            </button>
            <button className="button button-outline" type="button" onClick={onClose} disabled={isSaving}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditDateModal
