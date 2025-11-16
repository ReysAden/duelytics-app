import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './i18n'

ReactDOM.createRoot(document.getElementById('root')).render(
  <Suspense fallback={<div className="flex items-center justify-center h-screen bg-slate-950"><p className="text-white">Loading...</p></div>}>
    <App />
  </Suspense>
)
