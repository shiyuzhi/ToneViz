import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Home from './home'   // 主入口

createRoot(document.getElementById('root')).render(
    <Home />
)

