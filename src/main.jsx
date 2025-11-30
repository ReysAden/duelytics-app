import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext'
import './index.css'
import './i18n'

ReactDOM.createRoot(document.getElementById('root')).render(
  <Suspense fallback={
    <div className="loading-container">
      <div className="loading-spinner"></div>
    </div>
  }>
    <AuthProvider>
      <App />
    </AuthProvider>
  </Suspense>
)
