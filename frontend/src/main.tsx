import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from "@sentry/react";
import './index.css'
import App from './App.tsx'

// Initialize Sentry
Sentry.init({
  dsn: "https://effc742c6e1ce1ca9e49ddd29e77b5c7@o4505242173702144.ingest.us.sentry.io/4510900396752896",
  sendDefaultPii: true,
});

// 等待应用渲染完成后，触发预渲染事件
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// 通知预渲染插件页面已加载完成
document.dispatchEvent(new Event('render-event'))
