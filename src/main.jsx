import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AppProvider } from './state/AppContext.jsx'
import './styles.css'

// 应用入口：AppProvider 包裹在 Router 外层，确保所有页面可访问全局 state 与 dispatch
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <App />
      </BrowserRouter>
    </AppProvider>
  </React.StrictMode>
)
