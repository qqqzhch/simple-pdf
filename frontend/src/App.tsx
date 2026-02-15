import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import { filesize } from 'filesize'
import { 
  Upload, FileText, Download, X, Check, Loader2, 
  FileUp, Combine, Scissors, Zap, 
  FileCheck, Trash2, AlertCircle
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface PDFFile {
  id: string
  file: File
  name: string
  size: number
  status: 'uploading' | 'processing' | 'done' | 'error'
  progress: number
  error?: string
  resultUrl?: string
}

type ToolType = 'convert' | 'merge' | 'split'

const tools = [
  {
    id: 'convert' as ToolType,
    label: 'PDF to Word',
    description: 'Convert PDF to editable Word document',
    icon: FileUp,
    color: 'from-blue-500 to-indigo-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    acceptedFiles: 1
  },
  {
    id: 'merge' as ToolType,
    label: 'Merge PDFs',
    description: 'Combine multiple PDFs into one',
    icon: Combine,
    color: 'from-emerald-500 to-teal-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    acceptedFiles: 10
  },
  {
    id: 'split' as ToolType,
    label: 'Split PDF',
    description: 'Extract specific pages from PDF',
    icon: Scissors,
    color: 'from-violet-500 to-purple-600',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
    acceptedFiles: 1
  }
]

// 模拟进度增长（实际项目中可以用真实的 SSE/WebSocket 进度）
const useSimulatedProgress = (
  status: 'uploading' | 'processing' | 'done' | 'error',
  targetProgress: number,
  onComplete?: () => void
) => {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (status === 'done') {
      setProgress(100)
      onComplete?.()
      return
    }
    if (status === 'error') {
      return
    }
    if (status === 'uploading' || status === 'processing') {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= targetProgress) {
            clearInterval(interval)
            return targetProgress
          }
          // 非线性增长，先快后慢
          const increment = Math.max(1, (targetProgress - prev) * 0.1)
          return Math.min(prev + increment, targetProgress)
        })
      }, 150)
      return () => clearInterval(interval)
    }
  }, [status, targetProgress, onComplete])

  return progress
}

// 格式化剩余时间
const formatTimeRemaining = (progress: number): string => {
  if (progress >= 90) return '即将完成...'
  if (progress >= 70) return '剩余约 5 秒'
  if (progress >= 50) return '剩余约 10 秒'
  if (progress >= 30) return '剩余约 20 秒'
  return '正在处理...'
}

function App() {
  const [files, setFiles] = useState<PDFFile[]>([])
  const [activeTab, setActiveTab] = useState<ToolType>('convert')
  const [splitPages, setSplitPages] = useState('')
  // 文件输入引用（保留以备后续使用)

  const activeTool = tools.find(t => t.id === activeTab)!

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const pdfFiles = acceptedFiles.filter(file => file.type === 'application/pdf')
    addFiles(pdfFiles)
  }, [activeTab, files.length])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: activeTab === 'merge',
    noClick: files.length > 0
  })

  const addFiles = (newFiles: File[]) => {
    const maxFiles = activeTool.acceptedFiles
    const currentCount = files.length
    const remainingSlots = maxFiles - currentCount
    
    if (remainingSlots <= 0) {
      alert(`Maximum ${maxFiles} file(s) allowed for ${activeTool.label}`)
      return
    }
    
    const filesToAdd = newFiles.slice(0, remainingSlots)
    
    const pdfFiles: PDFFile[] = filesToAdd.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      name: file.name,
      size: file.size,
      status: 'uploading',
      progress: 0
    }))
    
    setFiles(prev => [...prev, ...pdfFiles])
    
    if (activeTab !== 'merge') {
      pdfFiles.forEach(processFile)
    }
  }

  const processFile = async (pdfFile: PDFFile) => {
    try {
      if (activeTab === 'convert') {
        await convertPDF(pdfFile)
      } else if (activeTab === 'split') {
        await splitPDF(pdfFile)
      }
    } catch (error) {
      setFiles(prev => prev.map(f => 
        f.id === pdfFile.id 
          ? { ...f, status: 'error', error: error instanceof Error ? error.message : 'Failed' }
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

    const response = await fetch(`${API_URL}/api/convert/pdf-to-word`, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      throw new Error('Conversion failed')
    }

    setFiles(prev => prev.map(f => 
      f.id === pdfFile.id ? { ...f, progress: 80 } : f
    ))

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)

    setFiles(prev => prev.map(f => 
      f.id === pdfFile.id ? { ...f, status: 'done', progress: 100, resultUrl: url } : f
    ))
  }

  const splitPDF = async (pdfFile: PDFFile) => {
    if (!splitPages) {
      throw new Error('Please specify pages to extract')
    }

    const formData = new FormData()
    formData.append('file', pdfFile.file)
    formData.append('pages', splitPages)

    setFiles(prev => prev.map(f => 
      f.id === pdfFile.id ? { ...f, status: 'processing', progress: 40 } : f
    ))

    const response = await fetch(`${API_URL}/api/split`, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      throw new Error('Split failed')
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)

    setFiles(prev => prev.map(f => 
      f.id === pdfFile.id ? { ...f, status: 'done', progress: 100, resultUrl: url } : f
    ))
  }

  const mergeAllPDFs = async () => {
    if (files.length < 2) {
      alert('Please upload at least 2 PDFs to merge')
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

      if (!response.ok) {
        throw new Error('Merge failed')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      const mergedFile: PDFFile = {
        id: 'merged-' + Date.now(),
        file: new File([], 'merged.pdf'),
        name: 'merged.pdf',
        size: blob.size,
        status: 'done',
        progress: 100,
        resultUrl: url
      }

      setFiles([mergedFile])
    } catch (error) {
      setFiles(prev => prev.map(f => ({ ...f, status: 'error', error: 'Merge failed' })))
    }
  }

  const removeFile = (id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id)
      if (file?.resultUrl) {
        URL.revokeObjectURL(file.resultUrl)
      }
      return prev.filter(f => f.id !== id)
    })
  }

  const clearAllFiles = () => {
    files.forEach(f => {
      if (f.resultUrl) URL.revokeObjectURL(f.resultUrl)
    })
    setFiles([])
  }

  const downloadFile = (url: string, filename: string) => {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // 判断是否显示上传区域
  const showUploadArea = files.length === 0 || activeTab === 'merge'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl blur-lg opacity-30"></div>
                <div className="relative w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                  <FileText className="w-5 h-5 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  SimplePDF
                </h1>
                <p className="text-xs text-slate-500 font-medium">Free PDF Tools</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-transparent"></div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-8">
          <div className="text-center">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-full text-sm text-blue-700 font-medium mb-6"
            >
              <Zap className="w-4 h-4" />
              <span>Free forever, no registration required</span>
            </motion.div>
            
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 tracking-tight"
            >
              Convert PDF Files
              <span className="block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                In Seconds
              </span>
            </motion.h2>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-slate-600 max-w-2xl mx-auto"
            >
              The simplest PDF converter. No ads, no watermarks, completely free.
            </motion.p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pb-20">
        {/* Tool Selection */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid md:grid-cols-3 gap-4 mb-8"
        >
          {tools.map((tool) => {
            const Icon = tool.icon
            const isActive = activeTab === tool.id
            
            return (
              <button
                key={tool.id}
                onClick={() => {
                  setActiveTab(tool.id)
                  setFiles([])
                  setSplitPages('')
                }}
                className={`group relative p-5 rounded-2xl border-2 text-left transition-all duration-300 ${
                  isActive
                    ? `${tool.bgColor} ${tool.borderColor} shadow-lg`
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center mb-3 shadow-lg transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                
                <h3 className={`font-bold text-base mb-1 ${isActive ? 'text-slate-900' : 'text-slate-700'}`}>
                  {tool.label}
                </h3>
                
                <p className={`text-xs ${isActive ? 'text-slate-600' : 'text-slate-500'}`}>
                  {tool.description}
                </p>
              </button>
            )
          })}
        </motion.div>

        {/* Split Pages Input */}
        <AnimatePresence>
          {activeTab === 'split' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Pages to Extract
                </label>
                <input
                  type="text"
                  value={splitPages}
                  onChange={(e) => setSplitPages(e.target.value)}
                  placeholder="e.g., 1,3,5-10 or 1-5"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Enter page numbers separated by commas, or ranges with hyphens
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload Area - 仅当有文件时才显示 */}
        <AnimatePresence>
          {showUploadArea && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
            >
              <div
                {...getRootProps()}
                className={`relative group cursor-pointer rounded-3xl border-2 border-dashed transition-all duration-300 ${
                  isDragActive
                    ? `border-blue-500 bg-blue-50 scale-[1.01]`
                    : 'border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50'
                }`}
                style={{ minHeight: files.length > 0 ? '120px' : '280px' }}
              >
                <input {...getInputProps()} />
                
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
                  <motion.div 
                    animate={isDragActive ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
                    className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${activeTool.color} flex items-center justify-center mb-4 shadow-xl`}
                  >
                    <Upload className="w-8 h-8 text-white" />
                  </motion.div>
                  
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">
                    {files.length > 0 ? 'Add more PDFs' : 'Drop your PDF here'}
                  </h3>
                  
                  <p className="text-slate-500 text-sm">
                    or click to browse
                  </p>
                  
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-3">
                    <FileCheck className="w-3 h-3" />
                    <span>Max 50MB</span>
                    {activeTab === 'merge' && (
                      <>
                        <span className="mx-1">•</span>
                        <span>Up to 10 files</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* File List with Progress */}
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-6 space-y-4"
            >
              {/* Merge Button for merge mode */}
              {activeTab === 'merge' && files.length >= 2 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center mb-6"
                >
                  <button
                    onClick={mergeAllPDFs}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:scale-105 transition-all"
                  >
                    <Combine className="w-5 h-5" />
                    Merge {files.length} PDF{files.length > 1 ? 's' : ''}
                  </button>
                </motion.div>
              )}

              {/* File Cards */}
              {files.map((file, index) => (
                <FileCard
                  key={file.id}
                  file={file}
                  index={index}
                  onRemove={() => removeFile(file.id)}
                  onDownload={() => downloadFile(
                    file.resultUrl!,
                    file.name.replace('.pdf', activeTab === 'convert' ? '.docx' : '.pdf')
                  )}
                />
              ))}

              {/* Clear All */}
              {files.some(f => f.status === 'done' || f.status === 'error') && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-center"
                >
                  <button
                    onClick={clearAllFiles}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear all
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-slate-900">SimplePDF</span>
            </div>
            <p className="text-sm text-slate-500">
              © 2025 SimplePDF. Free PDF tools for everyone.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

// 单个文件卡片组件
interface FileCardProps {
  file: PDFFile
  index: number
  onRemove: () => void
  onDownload: () => void
}

function FileCard({ file, index, onRemove, onDownload }: FileCardProps) {
  const simulatedProgress = useSimulatedProgress(file.status, file.progress)
  
  const isProcessing = file.status === 'uploading' || file.status === 'processing'
  const isDone = file.status === 'done'
  const isError = file.status === 'error'

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-4">
        {/* File Icon */}
        <div className="relative shrink-0">
          <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-orange-100 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-red-500" />
          </div>
          
          {/* Status Badge */}
          <AnimatePresence mode="wait">
            {isDone && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center"
              >
                <Check className="w-3 h-3 text-white" />
              </motion.div>
            )}
            {isError && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
              >
                <X className="w-3 h-3 text-white" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* File Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-slate-900 truncate">
              {file.name}
            </p>
            <span className="text-xs text-slate-400 shrink-0">
              {filesize(file.size)}
            </span>
          </div>
          
          {/* Progress Bar */}
          {isProcessing && (
            <div className="mt-3">
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${simulatedProgress}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                  <span className="text-xs text-slate-500">
                    {file.status === 'uploading' ? 'Uploading...' : 'Converting...'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">
                    {formatTimeRemaining(simulatedProgress)}
                  </span>
                  <span className="text-xs font-medium text-slate-600 min-w-[32px] text-right">
                    {Math.round(simulatedProgress)}%
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {/* Error Message */}
          {isError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-1.5 mt-1 text-sm text-red-600"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{file.error || 'Conversion failed'}</span>
            </motion.div>
          )}
          
          {/* Success Info */}
          {isDone && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-1.5 mt-1 text-sm text-emerald-600"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Ready for download</span>
            </motion.div>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Download Button */}
          <AnimatePresence>
            {isDone && file.resultUrl && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onDownload}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-slate-800 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </motion.button>
            )}
          </AnimatePresence>
          
          {/* Remove Button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onRemove}
            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

export default App
