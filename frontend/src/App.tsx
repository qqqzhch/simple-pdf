import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import { filesize } from 'filesize'
import { 
  Upload, FileText, Download, X, Check,
  FileUp, Combine, Scissors, ArrowLeft, Shield, Clock
} from 'lucide-react'
import { Link, useParams, useNavigate } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface PDFFile {
  id: string
  file: File
  name: string
  size: number
  totalPages: number
  status: 'uploading' | 'analyzing' | 'ready' | 'processing' | 'done' | 'error'
  progress: number
  error?: string
  resultUrl?: string
}

type ToolType = 'convert' | 'merge' | 'split' | 'compress' | 'pdf-to-image' | 'image-to-pdf'

interface ToolConfig {
  id: ToolType
  label: string
  description: string
  longDescription: string
  icon: React.ElementType
  color: string
  acceptedFiles: number
  outputExt: string
}

const tools: ToolConfig[] = [
  {
    id: 'convert',
    label: 'PDF to Word',
    description: 'Convert PDF to editable DOCX',
    longDescription: 'Transform your PDF files into editable Microsoft Word documents. Perfect for editing contracts, reports, and any PDF content.',
    icon: FileUp,
    color: 'from-blue-500 to-indigo-600',
    acceptedFiles: 1,
    outputExt: '.docx'
  },
  {
    id: 'merge',
    label: 'Merge PDFs',
    description: 'Combine multiple PDFs into one',
    longDescription: 'Combine multiple PDF files into a single document. Reorder pages and merge documents easily.',
    icon: Combine,
    color: 'from-emerald-500 to-teal-600',
    acceptedFiles: 10,
    outputExt: '.pdf'
  },
  {
    id: 'split',
    label: 'Split PDF',
    description: 'Extract specific pages',
    longDescription: 'Extract specific pages or ranges from your PDF. Create new PDFs from selected pages.',
    icon: Scissors,
    color: 'from-violet-500 to-purple-600',
    acceptedFiles: 1,
    outputExt: '.pdf'
  },
  {
    id: 'compress',
    label: 'Compress PDF',
    description: 'Reduce PDF file size',
    longDescription: 'Compress PDF files to reduce their size for email attachments and faster sharing. Choose from different compression levels.',
    icon: FileText,
    color: 'from-orange-500 to-red-500',
    acceptedFiles: 1,
    outputExt: '.pdf'
  },
  {
    id: 'pdf-to-image',
    label: 'PDF to Image',
    description: 'Convert PDF pages to images',
    longDescription: 'Convert each page of your PDF to JPG or PNG images. Download as a ZIP file containing all pages.',
    icon: FileText,
    color: 'from-cyan-500 to-blue-500',
    acceptedFiles: 1,
    outputExt: '.zip'
  },
  {
    id: 'image-to-pdf',
    label: 'Image to PDF',
    description: 'Convert images to PDF',
    longDescription: 'Convert JPG, PNG and other image formats to PDF. Combine multiple images into a single PDF document.',
    icon: FileText,
    color: 'from-pink-500 to-rose-500',
    acceptedFiles: 20,
    outputExt: '.pdf'
  }
]

// ============================================
// HOME PAGE
// ============================================
function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <section className="pt-16 pb-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-full text-sm text-blue-700 font-medium mb-6"
          >
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            <span>Free forever, no registration</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl sm:text-6xl font-bold text-slate-900 mb-6 tracking-tight"
          >
            Every tool you need to
            <span className="block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              work with PDFs
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-slate-600 max-w-2xl mx-auto mb-8"
          >
            All the PDF tools you need, right here. 100% free and easy to use.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center gap-6 text-sm text-slate-500"
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span>Secure & Private</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span>Auto-delete in 1 hour</span>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid md:grid-cols-3 gap-6"
          >
            {tools.map((tool) => {
              const Icon = tool.icon
              return (
                <Link
                  key={tool.id}
                  to={`/tool/${tool.id}`}
                  className="group bg-white rounded-2xl border-2 border-slate-200 p-6 hover:border-blue-300 hover:shadow-xl transition-all duration-300"
                >
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  
                  <h3 className="font-bold text-xl text-slate-900 mb-2">
                    {tool.label}
                  </h3>
                  
                  <p className="text-slate-500 text-sm mb-4">
                    {tool.description}
                  </p>

                  <div className="flex items-center text-blue-600 font-medium text-sm">
                    <span>Use Tool</span>
                    <ArrowLeft className="w-4 h-4 rotate-180 ml-1 opacity-0 group-hover:opacity-100 transition-all" />
                  </div>
                </Link>
              )
            })}
          </motion.div>
        </div>
      </section>
    </div>
  )
}

// ============================================
// TOOL PAGE
// ============================================
function ToolPage() {
  const { toolId } = useParams<{ toolId: ToolType }>()
  const navigate = useNavigate()
  const tool = tools.find(t => t.id === toolId)
  
  const [files, setFiles] = useState<PDFFile[]>([])
  // 分组类型
  interface PageGroup {
    id: string
    start: number
    end: number
  }

  // Split PDF 专用状态
  const [splitConfig, setSplitConfig] = useState<{
    fileId: string
    totalPages: number
    selectedPages: string
    pageMode: 'group' | 'all' | 'range'
    groups: PageGroup[]
  } | null>(null)

  // Compress PDF 专用状态
  const [compressLevel, setCompressLevel] = useState<'low' | 'medium' | 'high'>('medium')

  // PDF to Image 专用状态
  const [imageFormat, setImageFormat] = useState<'jpg' | 'png'>('jpg')
  const [imageDpi, setImageDpi] = useState<number>(150)

  // Image to PDF 专用状态
  const [pdfPageSize, setPdfPageSize] = useState<'A4' | 'Letter' | 'original'>('A4')

  if (!tool) {
    return <div>Tool not found</div>
  }

  const Icon = tool.icon
  const hasFiles = files.length > 0

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (tool.id === 'image-to-pdf') {
      // Image to PDF: accept images
      const imageFiles = acceptedFiles.filter(file => 
        file.type.startsWith('image/') || 
        ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.gif', '.webp'].some(ext => 
          file.name.toLowerCase().endsWith(ext)
        )
      )
      addFiles(imageFiles)
    } else {
      // Other tools: accept PDF only
      const pdfFiles = acceptedFiles.filter(file => file.type === 'application/pdf')
      addFiles(pdfFiles)
    }
  }, [toolId, files.length])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: tool.id === 'image-to-pdf' 
      ? { 'image/*': ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.gif', '.webp'] }
      : { 'application/pdf': ['.pdf'] },
    multiple: tool.id === 'merge' || tool.id === 'image-to-pdf',
    noClick: hasFiles && tool.id !== 'merge' && tool.id !== 'image-to-pdf'
  })

  // 获取 PDF 信息（页数等）- Split PDF 专用
  const getPDFInfo = async (file: File): Promise<{ pages: number }> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${API_URL}/api/pdf-info`, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) throw new Error('Failed to get PDF info')
    
    const data = await response.json()
    return { pages: data.pages }
  }

  const addFiles = async (newFiles: File[]) => {
    const remainingSlots = tool.acceptedFiles - files.length
    
    if (remainingSlots <= 0) {
      alert(`Maximum ${tool.acceptedFiles} file(s) allowed`)
      return
    }
    
    const filesToAdd = newFiles.slice(0, remainingSlots)
    
    // Split PDF：先获取页数信息
    if (tool.id === 'split' && filesToAdd.length > 0) {
      const file = filesToAdd[0]
      const tempId = Math.random().toString(36).substring(7)
      
      // 添加文件（分析中状态）
      const pdfFile: PDFFile = {
        id: tempId,
        file,
        name: file.name,
        size: file.size,
        totalPages: 0,
        status: 'analyzing',
        progress: 0
      }
      
      setFiles([pdfFile])
      
      try {
        // 获取 PDF 页数
        const { pages } = await getPDFInfo(file)
        
        // 更新文件状态
        setFiles([{
          ...pdfFile,
          totalPages: pages,
          status: 'ready'
        }])
        
        // 初始化拆分配置 - 默认使用分组模式，每2页一组
        const defaultGroupSize = 2
        const defaultGroups: PageGroup[] = Array.from(
          {length: Math.ceil(pages/defaultGroupSize)}, 
          (_,i) => ({
            id: `group-${i}`,
            start: i*defaultGroupSize+1,
            end: Math.min(i*defaultGroupSize+defaultGroupSize, pages)
          })
        )
        const defaultPages = defaultGroups.map(g => `${g.start}-${g.end}`).join(',')
        
        console.log('Initializing split config with pages:', defaultPages)
        
        // 设置拆分配置
        setSplitConfig({
          fileId: tempId,
          totalPages: pages,
          selectedPages: defaultPages,
          pageMode: 'group',
          groups: defaultGroups
        })
      } catch (error) {
        setFiles([{
          ...pdfFile,
          status: 'error',
          error: 'Failed to analyze PDF'
        }])
      }
      return
    }
    
    // Convert 和 Merge：直接处理
    const pdfFiles: PDFFile[] = filesToAdd.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      name: file.name,
      size: file.size,
      totalPages: 0,
      status: 'uploading',
      progress: 0
    }))
    
    setFiles(prev => [...prev, ...pdfFiles])
    
    if (tool.id === 'convert') {
      pdfFiles.forEach(convertPDF)
    } else if (tool.id === 'compress') {
      pdfFiles.forEach(compressPDF)
    } else if (tool.id === 'pdf-to-image') {
      // PDF to Image: 需要等待用户选择格式
      // 不做自动处理，等待用户点击转换按钮
    } else if (tool.id === 'image-to-pdf') {
      // Image to PDF: 需要等待用户选择页面尺寸
      // 不做自动处理，等待用户点击转换按钮
    }
  }

  const convertPdfToImage = async (pdfFile: PDFFile) => {
    const formData = new FormData()
    formData.append('file', pdfFile.file)
    formData.append('format', imageFormat)
    formData.append('dpi', String(imageDpi))

    setFiles(prev => prev.map(f =>
      f.id === pdfFile.id ? { ...f, status: 'processing', progress: 30 } : f
    ))

    try {
      const response = await fetch(`${API_URL}/api/convert/pdf-to-image`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) throw new Error('Conversion failed')

      const totalPages = response.headers.get('X-Total-Pages') || '0'
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      setFiles(prev => prev.map(f =>
        f.id === pdfFile.id ? {
          ...f,
          status: 'done',
          progress: 100,
          resultUrl: url,
          // @ts-ignore
          totalPages: parseInt(totalPages)
        } : f
      ))
    } catch (error) {
      setFiles(prev => prev.map(f =>
        f.id === pdfFile.id
          ? { ...f, status: 'error', error: 'Conversion failed' }
          : f
      ))
    }
  }

  const convertImagesToPdf = async () => {
    if (files.length === 0) return

    const formData = new FormData()
    files.forEach(f => formData.append('files', f.file))
    formData.append('page_size', pdfPageSize)

    setFiles(prev => prev.map(f => ({ ...f, status: 'processing', progress: 40 })))

    try {
      const response = await fetch(`${API_URL}/api/convert/image-to-pdf`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) throw new Error('Conversion failed')

      const totalImages = response.headers.get('X-Total-Images') || '0'
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      setFiles([{
        id: 'converted-' + Date.now(),
        file: new File([], 'converted.pdf'),
        name: 'converted.pdf',
        size: blob.size,
        totalPages: parseInt(totalImages),
        status: 'done',
        progress: 100,
        resultUrl: url
      }])
    } catch (error) {
      setFiles(prev => prev.map(f => ({ ...f, status: 'error', error: 'Conversion failed' })))
    }
  }

  const compressPDF = async (pdfFile: PDFFile) => {
    const formData = new FormData()
    formData.append('file', pdfFile.file)
    formData.append('level', compressLevel)

    setFiles(prev => prev.map(f =>
      f.id === pdfFile.id ? { ...f, status: 'processing', progress: 40 } : f
    ))

    try {
      const response = await fetch(`${API_URL}/api/compress`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) throw new Error('Compression failed')

      const originalSize = parseInt(response.headers.get('X-Original-Size') || '0')
      const compressedSize = parseInt(response.headers.get('X-Compressed-Size') || '0')
      const ratio = response.headers.get('X-Compression-Ratio') || '0'

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      setFiles(prev => prev.map(f =>
        f.id === pdfFile.id ? {
          ...f,
          status: 'done',
          progress: 100,
          resultUrl: url,
          // @ts-ignore
          compressionInfo: {
            original: originalSize,
            compressed: compressedSize,
            ratio: ratio
          }
        } : f
      ))
    } catch (error) {
      setFiles(prev => prev.map(f =>
        f.id === pdfFile.id
          ? { ...f, status: 'error', error: 'Compression failed' }
          : f
      ))
    }
  }

  const convertPDF = async (pdfFile: PDFFile) => {
    const formData = new FormData()
    formData.append('file', pdfFile.file)

    setFiles(prev => prev.map(f => 
      f.id === pdfFile.id ? { ...f, status: 'processing', progress: 30 } : f
    ))

    try {
      const response = await fetch(`${API_URL}/api/convert/pdf-to-word`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) throw new Error('Conversion failed')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      setFiles(prev => prev.map(f => 
        f.id === pdfFile.id ? { ...f, status: 'done', progress: 100, resultUrl: url } : f
      ))
    } catch (error) {
      setFiles(prev => prev.map(f => 
        f.id === pdfFile.id 
          ? { ...f, status: 'error', error: 'Conversion failed' }
          : f
      ))
    }
  }

  const splitPDF = async () => {
    // 获取当前状态
    const currentConfig = splitConfig
    
    console.log('Split PDF called:', { currentConfig, splitConfig, files })
    
    // 使用最新的状态
    const configToUse = currentConfig || splitConfig
    
    if (!configToUse) {
      alert('Please configure page selection')
      return
    }
    
    if (!configToUse.selectedPages || configToUse.selectedPages.trim() === '') {
      alert('Please select pages to extract')
      return
    }

    const file = files[0]
    console.log('File object:', file)
    
    if (!file) {
      alert('No file selected')
      return
    }
    
    if (!file.file) {
      alert('File data missing')
      console.error('file.file is undefined', file)
      return
    }

    const formData = new FormData()
    formData.append('file', file.file)
    formData.append('pages', configToUse.selectedPages)
    
    // 检查 FormData 内容
    console.log('FormData entries:')
    for (const [key, value] of formData.entries()) {
      console.log(`  ${key}:`, typeof value === 'string' ? value : `File(${file.file.name})`)
    }

    setFiles(prev => prev.map(f => 
      f.id === file.id ? { ...f, status: 'processing', progress: 40 } : f
    ))

    try {
      const response = await fetch(`${API_URL}/api/split`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) throw new Error('Split failed')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      setFiles(prev => prev.map(f => 
        f.id === file.id ? { ...f, status: 'done', progress: 100, resultUrl: url } : f
      ))
    } catch (error) {
      setFiles(prev => prev.map(f => 
        f.id === file.id 
          ? { ...f, status: 'error', error: 'Split failed' }
          : f
      ))
    }
  }

  const mergeAllPDFs = async () => {
    if (files.length < 2) {
      alert('Please upload at least 2 PDFs')
      return
    }

    setFiles(prev => prev.map(f => ({ ...f, status: 'processing', progress: 20 })))

    const formData = new FormData()
    files.forEach(f => formData.append('files', f.file))

    try {
      const response = await fetch(`${API_URL}/api/merge`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) throw new Error('Merge failed')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      setFiles([{
        id: 'merged-' + Date.now(),
        file: new File([], 'merged.pdf'),
        name: 'merged.pdf',
        size: blob.size,
        totalPages: 0,
        status: 'done',
        progress: 100,
        resultUrl: url
      }])
    } catch (error) {
      setFiles(prev => prev.map(f => ({ ...f, status: 'error', error: 'Merge failed' })))
    }
  }

  const removeFile = (id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id)
      if (file?.resultUrl) URL.revokeObjectURL(file.resultUrl)
      return prev.filter(f => f.id !== id)
    })
    if (splitConfig?.fileId === id) {
      setSplitConfig(null)
    }
  }

  const downloadFile = (url: string, filename: string) => {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // 分组大小状态（用于"每N页分割"功能）
  const [groupSize, setGroupSize] = useState(2)

  // 生成分组页面字符串（每N页一组）
  const generateGroupedPages = (total: number, size: number): string => {
    return Array.from({length: Math.ceil(total/size)}, (_,i) => 
      `${i*size+1}-${Math.min(i*size+size, total)}`
    ).join(',')
  }

  // 从 groups 生成 pages 字符串
  const generatePagesFromGroups = (groups: PageGroup[]): string => {
    return groups.map(g => `${g.start}-${g.end}`).join(',')
  }

  // 更新单个分组
  const updateGroup = (groupId: string, field: 'start' | 'end', value: number) => {
    setSplitConfig(prev => {
      if (!prev) return null
      const newGroups = prev.groups.map(g => 
        g.id === groupId ? { ...g, [field]: value } : g
      )
      return {
        ...prev,
        groups: newGroups,
        selectedPages: generatePagesFromGroups(newGroups)
      }
    })
  }

  // 添加新分组
  const addGroup = () => {
    setSplitConfig(prev => {
      if (!prev) return null
      const totalPages = prev.totalPages
      // 找到最后一个分组的结束页
      const lastGroup = prev.groups[prev.groups.length - 1]
      const newStart = lastGroup ? lastGroup.end + 1 : 1
      
      if (newStart > totalPages) {
        alert('No more pages available')
        return prev
      }
      
      const newGroup: PageGroup = {
        id: `group-${Date.now()}`,
        start: newStart,
        end: Math.min(newStart, totalPages)
      }
      
      const newGroups = [...prev.groups, newGroup]
      return {
        ...prev,
        groups: newGroups,
        selectedPages: generatePagesFromGroups(newGroups)
      }
    })
  }

  // 删除分组
  const removeGroup = (groupId: string) => {
    setSplitConfig(prev => {
      if (!prev) return null
      const newGroups = prev.groups.filter(g => g.id !== groupId)
      return {
        ...prev,
        groups: newGroups,
        selectedPages: generatePagesFromGroups(newGroups)
      }
    })
  }

  // 页面选择器组件 - 新版
  const PageSelector = () => {
    if (!splitConfig) return null
    
    const totalPages = splitConfig.totalPages
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border-2 border-violet-200 p-6 shadow-lg"
      >
        <h3 className="text-lg font-bold text-slate-900 mb-2">
          Select Pages to Extract
        </h3>
        
        <p className="text-sm text-slate-500 mb-4">
          Total pages: <span className="font-semibold text-violet-600">{totalPages}</span>
        </p>

        {/* 快速分组按钮 */}
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => {
              const generated = generateGroupedPages(totalPages, groupSize)
              const newGroups: PageGroup[] = Array.from(
                {length: Math.ceil(totalPages/groupSize)}, 
                (_,i) => ({
                  id: `group-${i}`,
                  start: i*groupSize+1,
                  end: Math.min(i*groupSize+groupSize, totalPages)
                })
              )
              setSplitConfig(prev => prev ? {
                ...prev,
                pageMode: 'group',
                groups: newGroups,
                selectedPages: generated
              } : null)
            }}
            className={`flex-1 py-3 px-4 rounded-xl border-2 text-left transition-all ${
              splitConfig.pageMode === 'group'
                ? 'border-violet-500 bg-violet-50'
                : 'border-slate-200 hover:border-violet-300'
            }`}
          >
            <div className="font-medium text-sm text-slate-900">Auto Group</div>
            <div className="text-xs text-slate-500 mt-1">Split every {groupSize} pages</div>
          </button>
          
          <div className="w-20">
            <label className="block text-xs text-slate-500 mb-1">Size</label>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={groupSize}
              onChange={(e) => {
                const size = Math.max(1, Math.min(totalPages, parseInt(e.target.value) || 1))
                setGroupSize(size)
              }}
              className="w-full px-3 py-2 text-center font-semibold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </div>

        {/* 分割线 */}
        <div className="flex items-center gap-4 my-4">
          <div className="flex-1 h-px bg-slate-200"></div>
          <span className="text-xs text-slate-400 uppercase">Or</span>
          <div className="flex-1 h-px bg-slate-200"></div>
        </div>

        {/* 全部和自定义按钮 */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setSplitConfig(prev => prev ? {
              ...prev,
              pageMode: 'all',
              selectedPages: Array.from({length: totalPages}, (_,i) => String(i+1)).join(','),
              groups: Array.from({length: totalPages}, (_,i) => ({id: `p-${i}`, start: i+1, end: i+1}))
            } : null)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium border-2 transition-all ${
              splitConfig.pageMode === 'all'
                ? 'border-violet-500 bg-violet-50 text-violet-700'
                : 'border-slate-200 text-slate-600 hover:border-violet-300'
            }`}
          >
            Every Page
          </button>
          <button
            onClick={() => setSplitConfig(prev => prev ? {
              ...prev,
              pageMode: 'range',
              selectedPages: generatePagesFromGroups(prev.groups)
            } : null)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium border-2 transition-all ${
              splitConfig.pageMode === 'range'
                ? 'border-violet-500 bg-violet-50 text-violet-700'
                : 'border-slate-200 text-slate-600 hover:border-violet-300'
            }`}
          >
            Custom Groups
          </button>
        </div>

        {/* 分组管理区域 - 只在 Custom Groups 模式显示 */}
        {splitConfig.pageMode === 'range' && (
          <div className="border-t border-slate-200 pt-4 mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-slate-700">
                Page Groups ({splitConfig.groups.length})
              </label>
              <button
                onClick={addGroup}
                className="text-sm text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1"
              >
                <span>+</span> Add Group
              </button>
            </div>
            
            {/* 分组列表 */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
            {splitConfig.groups.map((group, index) => (
              <div key={group.id} className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
                <span className="text-sm font-medium text-slate-500 w-6">
                  {index + 1}
                </span>
                
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-slate-500">From</label>
                    <input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={group.start}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1
                        updateGroup(group.id, 'start', Math.max(1, Math.min(val, group.end)))
                      }}
                      className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  
                  <span className="text-slate-400 pt-4">-</span>
                  
                  <div className="flex-1">
                    <label className="text-xs text-slate-500">To</label>
                    <input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={group.end}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1
                        updateGroup(group.id, 'end', Math.max(group.start, Math.min(val, totalPages)))
                      }}
                      className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>
                
                <button
                  onClick={() => removeGroup(group.id)}
                  disabled={splitConfig.groups.length <= 1}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* 当前选择提示 */}
        {splitConfig.selectedPages && (
          <div className="mt-4 p-3 bg-violet-50 rounded-lg">
            <p className="text-sm text-violet-700">
              <span className="font-medium">Output: </span>
              {splitConfig.groups.length} PDF{splitConfig.groups.length > 1 ? 's' : ''} 
              <span className="text-violet-500 ml-2">
                ({splitConfig.selectedPages.length > 40 
                  ? splitConfig.selectedPages.slice(0, 40) + '...' 
                  : splitConfig.selectedPages})
              </span>
            </p>
          </div>
        )}

        {/* 拆分按钮 */}
        <button
          onClick={splitPDF}
          disabled={!splitConfig.selectedPages || files[0]?.status === 'processing'}
          className="w-full mt-4 py-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Split PDF into {splitConfig.groups.length} file{splitConfig.groups.length > 1 ? 's' : ''}
        </button>
      </motion.div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Tools</span>
          </button>
        </div>
      </header>

      {/* Tool Hero */}
      <section className="pt-10 pb-6">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${tool.color} flex items-center justify-center mb-4 shadow-xl`}
          >
            <Icon className="w-8 h-8 text-white" />
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl font-bold text-slate-900 mb-2"
          >
            {tool.label}
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-slate-600"
          >
            {tool.longDescription}
          </motion.p>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 pb-20">
        <AnimatePresence mode="wait">
          {!hasFiles ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div
                {...getRootProps()}
                className={`relative group cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 bg-white ${
                  isDragActive
                    ? `border-blue-500 bg-blue-50 scale-[1.02]`
                    : 'border-slate-300 hover:border-blue-400'
                }`}
                style={{ minHeight: '280px' }}
              >
                <input {...getInputProps()} />
                
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
                  <motion.div 
                    animate={isDragActive ? { scale: 1.1, y: -8 } : { scale: 1, y: 0 }}
                    className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${tool.color} flex items-center justify-center mb-5 shadow-xl`}
                  >
                    <Upload className="w-10 h-10 text-white" />
                  </motion.div>
                  
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    {tool.id === 'image-to-pdf' ? 'Select image files' : 'Select PDF file'}
                  </h3>
                  
                  <p className="text-slate-500 text-center mb-2">
                    {tool.id === 'image-to-pdf' 
                      ? 'or drag and drop your images here' 
                      : 'or drag and drop your PDF here'}
                  </p>
                  
                  <div className="flex items-center gap-2 text-sm text-slate-400 mt-3">
                    <FileText className="w-4 h-4" />
                    <span>Max 50MB • {tool.acceptedFiles === 1 ? '1 file' : 'Up to ' + tool.acceptedFiles + ' files'}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* 文件卡片 */}
              {files.map((file) => (
                <div
                  key={file.id}
                  className="bg-white rounded-2xl border-2 border-slate-200 p-5 shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <div className="relative shrink-0">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center`}>
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      {file.status === 'done' && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-slate-900 truncate pr-4">{file.name}</p>
                        <button
                          onClick={() => removeFile(file.id)}
                          className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      
                      <p className="text-sm text-slate-500">
                        {filesize(file.size)}
                        {file.totalPages > 0 && (
                          <span className="ml-2 text-violet-600 font-medium">
                            • {file.totalPages} pages
                          </span>
                        )}
                      </p>
                      
                      {file.status === 'analyzing' && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-violet-600">
                          <div className="w-4 h-4 border-2 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
                          Analyzing PDF...
                        </div>
                      )}
                      
                      {file.status === 'processing' && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium text-violet-600">Processing...</span>
                            <span className="text-xs font-bold text-violet-600">{Math.round(file.progress)}%</span>
                          </div>
                          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full bg-gradient-to-r ${tool.color}`}
                              style={{ width: `${file.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {file.status === 'error' && (
                        <div className="mt-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                          {file.error}
                        </div>
                      )}
                      
                      {file.status === 'done' && file.resultUrl && (
                        <div className="mt-3 flex items-center gap-3">
                          <div className="flex-1 flex items-center gap-1.5 text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
                            <Check className="w-4 h-4" />
                            <span>
                              {tool.id === 'split' ? 'ZIP file ready' : 'Ready for download'}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              // Split PDF 下载 ZIP，其他工具按原扩展名
                              const downloadName = tool.id === 'split' 
                                ? file.name.replace('.pdf', '.zip')
                                : file.name.replace('.pdf', tool.outputExt)
                              downloadFile(file.resultUrl!, downloadName)
                            }}
                            className={`px-4 py-2 bg-gradient-to-r ${tool.color} text-white text-sm font-semibold rounded-lg hover:shadow-lg transition-all flex items-center gap-1.5`}
                          >
                            <Download className="w-4 h-4" />
                            Download {tool.id === 'split' ? 'ZIP' : ''}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Split PDF：页面选择器 */}
              {tool.id === 'split' && files[0]?.status === 'ready' && <PageSelector />}

              {/* Merge PDF：合并按钮 */}
              {tool.id === 'merge' && files.length >= 2 && (
                <div className="pt-4">
                  <button
                    onClick={mergeAllPDFs}
                    disabled={files.some(f => f.status === 'processing')}
                    className={`w-full py-4 bg-gradient-to-r ${tool.color} text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <Combine className="w-5 h-5 inline mr-2" />
                    Merge {files.length} PDFs into one
                  </button>
                </div>
              )}

              {/* Merge：添加更多文件 */}
              {tool.id === 'merge' && files.length < tool.acceptedFiles && (
                <div className="pt-2">
                  <div
                    {...getRootProps()}
                    className="relative cursor-pointer rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 bg-white p-4 text-center transition-all"
                  >
                    <input {...getInputProps()} />
                    <span className="text-slate-500 font-medium">+ Add more PDFs</span>
                  </div>
                </div>
              )}

              {/* Compress PDF：压缩级别选择 */}
              {tool.id === 'compress' && files[0]?.status === 'ready' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl border-2 border-orange-200 p-6 shadow-lg"
                >
                  <h3 className="text-lg font-bold text-slate-900 mb-4">
                    Select Compression Level
                  </h3>

                  <div className="space-y-3">
                    <button
                      onClick={() => setCompressLevel('low')}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                        compressLevel === 'low'
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-slate-200 hover:border-orange-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-900">Low Compression</div>
                          <div className="text-sm text-slate-500">Better quality, smaller size reduction</div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 ${
                          compressLevel === 'low' ? 'border-orange-500 bg-orange-500' : 'border-slate-300'
                        }`} />
                      </div>
                    </button>

                    <button
                      onClick={() => setCompressLevel('medium')}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                        compressLevel === 'medium'
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-slate-200 hover:border-orange-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-900">Medium Compression</div>
                          <div className="text-sm text-slate-500">Balanced quality and file size</div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 ${
                          compressLevel === 'medium' ? 'border-orange-500 bg-orange-500' : 'border-slate-300'
                        }`} />
                      </div>
                    </button>

                    <button
                      onClick={() => setCompressLevel('high')}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                        compressLevel === 'high'
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-slate-200 hover:border-orange-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-900">High Compression</div>
                          <div className="text-sm text-slate-500">Smallest file size, reduced quality</div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 ${
                          compressLevel === 'high' ? 'border-orange-500 bg-orange-500' : 'border-slate-300'
                        }`} />
                      </div>
                    </button>
                  </div>

                  <button
                    onClick={() => files[0] && compressPDF(files[0])}
                    disabled={!files[0] || files[0].status !== 'ready'}
                    className="w-full mt-6 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Compress PDF
                  </button>
                </motion.div>
              )}

              {/* PDF to Image: 格式选择 */}
              {tool.id === 'pdf-to-image' && files[0]?.status === 'ready' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl border-2 border-cyan-200 p-6 shadow-lg"
                >
                  <h3 className="text-lg font-bold text-slate-900 mb-4">
                    Image Format Settings
                  </h3>

                  {/* 格式选择 */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Format</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setImageFormat('jpg')}
                        className={`flex-1 py-2 px-4 rounded-lg border-2 font-medium transition-all ${
                          imageFormat === 'jpg'
                            ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                            : 'border-slate-200 text-slate-600 hover:border-cyan-300'
                        }`}
                      >
                        JPG
                      </button>
                      <button
                        onClick={() => setImageFormat('png')}
                        className={`flex-1 py-2 px-4 rounded-lg border-2 font-medium transition-all ${
                          imageFormat === 'png'
                            ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                            : 'border-slate-200 text-slate-600 hover:border-cyan-300'
                        }`}
                      >
                        PNG
                      </button>
                    </div>
                  </div>

                  {/* DPI 选择 */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Quality (DPI): {imageDpi}
                    </label>
                    <input
                      type="range"
                      min="72"
                      max="300"
                      step="24"
                      value={imageDpi}
                      onChange={(e) => setImageDpi(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>72 DPI (Web)</span>
                      <span>150 DPI (Standard)</span>
                      <span>300 DPI (Print)</span>
                    </div>
                  </div>

                  <button
                    onClick={() => files[0] && convertPdfToImage(files[0])}
                    disabled={!files[0] || files[0].status !== 'ready'}
                    className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Convert to Images
                  </button>
                </motion.div>
              )}

              {/* Image to PDF: 页面尺寸选择 */}
              {tool.id === 'image-to-pdf' && files.length > 0 && files[0]?.status === 'ready' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl border-2 border-pink-200 p-6 shadow-lg"
                >
                  <h3 className="text-lg font-bold text-slate-900 mb-4">
                    Page Size Settings
                  </h3>

                  <div className="space-y-3 mb-6">
                    <button
                      onClick={() => setPdfPageSize('original')}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                        pdfPageSize === 'original'
                          ? 'border-pink-500 bg-pink-50'
                          : 'border-slate-200 hover:border-pink-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-900">Original Size</div>
                          <div className="text-sm text-slate-500">Keep original image dimensions</div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 ${
                          pdfPageSize === 'original' ? 'border-pink-500 bg-pink-500' : 'border-slate-300'
                        }`} />
                      </div>
                    </button>

                    <button
                      onClick={() => setPdfPageSize('A4')}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                        pdfPageSize === 'A4'
                          ? 'border-pink-500 bg-pink-50'
                          : 'border-slate-200 hover:border-pink-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-900">A4 Size</div>
                          <div className="text-sm text-slate-500">Standard A4 page (210 × 297 mm)</div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 ${
                          pdfPageSize === 'A4' ? 'border-pink-500 bg-pink-500' : 'border-slate-300'
                        }`} />
                      </div>
                    </button>

                    <button
                      onClick={() => setPdfPageSize('Letter')}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                        pdfPageSize === 'Letter'
                          ? 'border-pink-500 bg-pink-50'
                          : 'border-slate-200 hover:border-pink-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-900">Letter Size</div>
                          <div className="text-sm text-slate-500">US Letter page (8.5 × 11 in)</div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 ${
                          pdfPageSize === 'Letter' ? 'border-pink-500 bg-pink-500' : 'border-slate-300'
                        }`} />
                      </div>
                    </button>
                  </div>

                  <button
                    onClick={convertImagesToPdf}
                    disabled={files.length === 0 || files.some(f => f.status !== 'ready')}
                    className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Convert {files.length} Image{files.length > 1 ? 's' : ''} to PDF
                  </button>
                </motion.div>
              )}

              {/* 重新开始 */}
              <div className="pt-4 text-center">
                <button
                  onClick={() => {
                    setFiles([])
                    setSplitConfig(null)
                  }}
                  className="text-slate-500 hover:text-slate-700 font-medium text-sm"
                >
                  Start over
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

// ============================================
// MAIN APP
// ============================================
import { BrowserRouter, Routes, Route } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/tool/:toolId" element={<ToolPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
