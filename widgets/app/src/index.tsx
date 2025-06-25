// import { scan } from 'react-scan'
import './assets/main.css'
import React from 'react'
import { createRoot } from 'react-dom/client'
import 'preline'
import { App } from './app/App.js'

// scan({
//   enabled: true,
//   log: true
// })

createRoot(document.getElementById('app') as HTMLElement).render(<App />)
