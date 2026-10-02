import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'

// Apply saved theme (or system preference) before the first paint
const savedTheme = localStorage.getItem('capacity_connect_theme')
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

document.documentElement.setAttribute(
  'data-theme',
  savedTheme || (prefersDark ? 'dark' : 'light')
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <ThemeToggle />
  </StrictMode>,
)