/**
 * Technical overview:
 * - Layer: frontend bootstrap
 * - Responsibility: mount React root and load global styles
 * - Runtime: starts app under React StrictMode
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
