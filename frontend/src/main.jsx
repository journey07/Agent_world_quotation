// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

console.log('🚀 Main entry point executing');

createRoot(document.getElementById('root')).render(
  <App />
)
