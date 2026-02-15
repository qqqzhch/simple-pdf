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

type ToolType = 'convert' | 'merge' | 'split'

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
  // Split PDF 专用状态
  const [splitConfig, setSplitConfig] = useState<{
    fileId: string
    totalPages: number
    selectedPages: string
    pageMode: 'group' | 'all' | 'range'
  } | null>(null)

  if (!tool) {
    return <div>Tool not found</div>
  }

  const Icon = tool.icon
  const hasFiles = files.length > 0

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const pdfFiles = acceptedFiles.filter(file => file.type === 'application/pdf')
    addFiles(pdfFiles)
  }, [toolId, files.length])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: tool.id === 'merge',
    noClick: hasFiles && tool.id !== 'merge'
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
        
        // 初始化拆分配置
        setSplitConfig({
          fileId: tempId,
          totalPages: pages,
          selectedPages: '',
          pageMode: 'range'
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
    if (!splitConfig || !splitConfig.selectedPages) {
      alert('Please select pages to extract')
      return
    }

    const file = files[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file.file)
    formData.append('pages', splitConfig.selectedPages)

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

  // 页面选择器组件 - 简化版
  const PageSelector = () => {
    if (!splitConfig) return null
    
    const totalPages = splitConfig.totalPages
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    
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

        {/* 分组设置 */}
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => {
              const generated = generateGroupedPages(totalPages, groupSize)
              setSplitConfig(prev => prev ? {
                ...prev,
                pageMode: 'group',
                selectedPages: generated
              } : null)
            }}
            className={`flex-1 py-3 px-4 rounded-xl border-2 text-left transition-all ${
              splitConfig.pageMode === 'group'
                ? 'border-violet-500 bg-violet-50'
                : 'border-slate-200 hover:border-violet-300'
            }`}
          >
            <div className="font-medium text-sm text-slate-900">Extract pages in groups</div>
            <div className="text-xs text-slate-500 mt-1">Split into groups of N pages</div>
          </button>
          
          <div className="w-20">
            <label className="block text-xs text-slate-500 mb-1">Pages</label>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={groupSize}
              onChange={(e) => {
                const size = Math.max(1, Math.min(totalPages, parseInt(e.target.value) || 1))
                setGroupSize(size)
                // 如果当前是分组模式，自动更新
                if (splitConfig.pageMode === 'group') {
                  setSplitConfig(prev => prev ? {
                    ...prev,
                    selectedPages: generateGroupedPages(totalPages, size)
                  } : null)
                }
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
              selectedPages: Array.from({length: totalPages}, (_,i) => String(i+1)).join(',')
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
              selectedPages: ''
            } : null)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium border-2 transition-all ${
              splitConfig.pageMode === 'range'
                ? 'border-violet-500 bg-violet-50 text-violet-700'
                : 'border-slate-200 text-slate-600 hover:border-violet-300'
            }`}
          >
            Custom
          </button>
        </div>

        {/* 自定义选择区域 - 只在 Custom 模式显示 */}
        {splitConfig.pageMode === 'range' && (
          <div className="border-t border-slate-200 pt-4 mt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">
                Custom Selection
              </label>
            </div>
            
            {/* 页面网格 */}
            <div className="grid grid-cols-10 gap-1.5 mb-3 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-xl">
              {pages.map((pageNum) => {
                const isSelected = splitConfig.selectedPages
                  .split(',')
                  .some(p => {
                    if (p.includes('-')) {
                      const [start, end] = p.split('-').map(Number)
                      return pageNum >= start && pageNum <= end
                    }
                    return Number(p) === pageNum
                  })
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => {
                      setSplitConfig(prev => {
                        if (!prev) return null
                        const current = prev.selectedPages.split(',').filter(p => p)
                        if (isSelected) {
                          return { ...prev, selectedPages: '' }
                        } else {
                          current.push(String(pageNum))
                          return { ...prev, selectedPages: current.join(',') }
                        }
                      })
                    }}
                    className={`w-8 h-8 rounded-md text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-violet-500 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:border-violet-300'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>

            {/* 自定义输入框 */}
            <input
              type="text"
              value={splitConfig.selectedPages}
              onChange={(e) => setSplitConfig(prev => prev ? { 
                ...prev, 
                selectedPages: e.target.value
              } : null)}
              placeholder="e.g., 1,3,5-10"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        )}

        {/* 当前选择提示 */}
        {splitConfig.selectedPages && (
          <div className="mt-4 p-3 bg-violet-50 rounded-lg">
            <p className="text-sm text-violet-700">
              <span className="font-medium">Selected: </span>
              {splitConfig.selectedPages.length > 50 
                ? splitConfig.selectedPages.slice(0, 50) + '...' 
                : splitConfig.selectedPages}
            </p>
          </div>
        )}

        {/* 拆分按钮 */}
        <button
          onClick={splitPDF}
          disabled={!splitConfig.selectedPages || files[0]?.status === 'processing'}
          className="w-full mt-4 py-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Split PDF
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
                    Select PDF file
                  </h3>
                  
                  <p className="text-slate-500 text-center mb-2">
                    or drag and drop your PDF here
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
                            <span>Ready for download</span>
                          </div>
                          <button
                            onClick={() => downloadFile(file.resultUrl!, file.name.replace('.pdf', tool.outputExt))}
                            className={`px-4 py-2 bg-gradient-to-r ${tool.color} text-white text-sm font-semibold rounded-lg hover:shadow-lg transition-all flex items-center gap-1.5`}
                          >
                            <Download className="w-4 h-4" />
                            Download
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
