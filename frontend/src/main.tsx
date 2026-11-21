import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import './styles/workspace-layout.css'
import './styles/cad-studio-refinement.css'
import App from './App.tsx'
import './styles/document-status-accessibility.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
