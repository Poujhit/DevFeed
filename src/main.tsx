import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import { ConvexProvider, ConvexReactClient } from "convex/react"

// Initialize the Convex client
// The URL comes from your Convex project's environment variables 
// (typically stored in .env.local or automatically injected by Convex CLI)
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  </React.StrictMode>,
)
