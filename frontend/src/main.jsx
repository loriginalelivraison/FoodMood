// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './leafletIconFix.js'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './auth/useAuth.jsx'
import { CartProvider } from './store/cart.jsx'
import { ToastProvider } from './components/Toast.jsx'   // ✅ AJOUT

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <ToastProvider>                           {/* ✅ AJOUT */}
            <App />
          </ToastProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
