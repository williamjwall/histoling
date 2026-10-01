import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { DesktopOnly } from './components/DesktopOnly.tsx'
import { isMobileDevice } from './lib/device.ts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isMobileDevice() ? <DesktopOnly /> : <App />}
  </StrictMode>,
)
