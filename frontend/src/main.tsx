import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import './styles/workspace-layout.css'
import './styles/cad-studio-refinement.css'
import './styles/cad-viewport-toolbar.css'
import './styles/ui-workbench-shell-detail-001.css'
import App from './App.tsx'
import './styles/atelier-home-workbench-layout-001.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
