import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 等待应用渲染完成后，触发预渲染事件
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// 通知预渲染插件页面已加载完成
document.dispatchEvent(new Event('render-event'))
