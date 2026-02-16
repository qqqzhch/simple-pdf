// rendertron.js - 轻量级预渲染（无需 Chrome）
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 预渲染配置
const routes = [
  { path: '/', title: 'SimplePDF - Free Online PDF Tools | Convert, Merge, Split PDFs', description: 'Free online PDF tools to convert PDF to Word, merge multiple PDFs, and split PDF pages. No registration, no watermarks, 100% free.' },
  { path: '/tool/convert', title: 'PDF to Word Converter - Free Online | SimplePDF', description: 'Convert PDF to editable Word documents online for free. No registration required. Fast and secure conversion.' },
  { path: '/tool/pdf-to-excel', title: 'PDF to Excel Converter - Extract Tables Free | SimplePDF', description: 'Extract tables from PDF to Excel spreadsheets online for free. Convert financial reports and invoices to XLSX.' },
  { path: '/tool/pdf-to-ppt', title: 'PDF to PowerPoint Converter - Free Online | SimplePDF', description: 'Convert PDF to PowerPoint presentations online for free. Transform PDF slides to editable PPT.' },
  { path: '/tool/merge', title: 'Merge PDF Files Online - Free PDF Combiner | SimplePDF', description: 'Combine multiple PDF files into one document online for free. Easy PDF merging tool.' },
  { path: '/tool/split', title: 'Split PDF Online - Extract Pages Free | SimplePDF', description: 'Extract specific pages from PDF files online for free. Split PDF into multiple files.' },
  { path: '/tool/compress', title: 'Compress PDF Online - Reduce File Size Free | SimplePDF', description: 'Compress PDF files online for free. Reduce file size for email attachments and faster sharing.' },
  { path: '/tool/encrypt', title: 'Encrypt PDF Online - Password Protect Free | SimplePDF', description: 'Add password protection to PDF files online for free. Secure your documents with AES-256 encryption.' },
  { path: '/tool/decrypt', title: 'Decrypt PDF Online - Remove Password Free | SimplePDF', description: 'Remove password protection from PDF files online for free. Unlock your PDF documents.' },
  { path: '/tool/watermark', title: 'Add Watermark to PDF - Free Online | SimplePDF', description: 'Add text or image watermarks to PDF files online for free. Protect your documents with custom watermarks.' },
]

async function prerender() {
  console.log('Starting prerender...')
  
  const distDir = path.join(__dirname, 'dist')
  const templatePath = path.join(distDir, 'index.html')
  const template = fs.readFileSync(templatePath, 'utf-8')
  
  for (const route of routes) {
    console.log(`Generating: ${route.path}`)
    
    // 替换 title 和 meta description
    let html = template
      .replace(/<title>.*?<\/title>/, `<title>${route.title}</title>`)
      .replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${route.description}">`)
      .replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="${route.title}">`)
      .replace(/<meta property="og:description" content=".*?">/, `<meta property="og:description" content="${route.description}">`)
    
    // 添加路由特定的内容标记（便于爬虫识别）
    const routeContent = `
      <div id="route-data" data-path="${route.path}" style="display:none"></div>
      <noscript>
        <h1>${route.title}</h1>
        <p>${route.description}</p>
        <p>SimplePDF offers free online PDF tools including PDF to Word converter, PDF merger, and PDF splitter.</p>
      </noscript>
    `
    html = html.replace('<div id="root"></div>', `<div id="root"></div>${routeContent}`)
    
    // 保存文件
    let outputPath
    if (route.path === '/') {
      outputPath = templatePath
    } else {
      const dir = path.join(distDir, route.path)
      fs.mkdirSync(dir, { recursive: true })
      outputPath = path.join(dir, 'index.html')
    }
    
    fs.writeFileSync(outputPath, html)
    console.log(`Saved: ${outputPath}`)
  }
  
  console.log('Prerender complete!')
}

prerender().catch(console.error)
