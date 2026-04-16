import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { DEV_MODE } from './config/devMode.ts'
import { initDevTime } from './utils/devTime.ts'

// Apply any stored dev time offset before stores rehydrate
if (DEV_MODE) initDevTime();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
