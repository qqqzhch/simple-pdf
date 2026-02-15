import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import { filesize } from 'filesize'
import { 
  Upload, FileText, Download, X, Check, Loader2, 
  FileUp, Combine, Scissors, ArrowRight,
  FileCheck, Trash2, AlertCircle, Shield, Clock, Sparkles, Zap
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ============================================
// TYPES
// ============================================
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

// ============================================
// COMPONENTS
// ============================================

// Tool Card Component
const ToolCard = ({ 
  tool, 
  isActive, 
  onClick,
  icon: Icon
}: { 
  tool: { id: ToolType; label: string; description: string }
  isActive: boolean
  onClick: () => void
  icon: React.ElementType
}) => (
  <motion.button
    onClick={onClick}
    whileHover={{ y: -4 }}
    whileTap={{ scale: 0.98 }}
    className={`tool-card ${isActive ? 'active' : ''}`}
  >
    <div className="icon-container mb-4">
      <Icon className="w-6 h-6" />
    </div>
    <h3 className="font-semibold text-lg text-gray-900 mb-1">
      {tool.label}
    </h3>
    <p className="text-sm text-gray-500">
      {tool.description}
    </p>
  </motion.button>
)

// File Card Component
const FileCard = ({ 
  file, 
  index, 
  onRemove, 
  onDownload 
}: { 
  file: PDFFile
  index: number
  onRemove: () => void
  onDownload: () => void
}) => {
  const [progress, setProgress] = useState(0)
  
  useEffect(() => {
    if (file.status === 'done') {
      setProgress(100)
      return
    }
    if (file.status === 'error') return
    
    if (file.status === 'uploading' || file.status === 'processing') {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= file.progress) {
            clearInterval(interval)
            return file.progress
          }
          return Math.min(prev + 1, file.progress)
        })
      }, 50)
      return () => clearInterval(interval)
    }
  }, [file.status, file.progress])

  const isProcessing = file.status === 'uploading' || file.status === 'processing'
  const isDone = file.status === 'done'
  const isError = file.status === 'error'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ delay: index * 0.05 }}
      className="modern-card p-5"
    >
      <div className="flex items-center gap-4">
        {/* File Icon */}
        <div className="relative shrink-0">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center">
            <FileText className="w-7 h-7 text-violet-600" />
          </div>
          
          <AnimatePresence>
            {isDone && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full status-success flex items-center justify-center"
              >
                <Check className="w-3 h-3 text-white" />
              </motion.div>
            )}
            {isError && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full status-error flex items-center justify-center"
              >
                <X className="w-3 h-3 text-white" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <p className="font-medium text-gray-900 truncate">
              {file.name}
            </p>
            <span className="text-xs text-gray-400 shrink-0">
              {filesize(file.size)}
            </span>
          </div>
          
          {isProcessing && (
            <div className="mt-3">
              <div className="progress-container">
                <motion.div
                  className="progress-bar"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 text-violet-500 animate-spin" />
                  <span className="text-xs text-gray-500">
                    {file.status === 'uploading' ? 'Uploading...' : 'Converting...'}
                  </span>
                </div>
                <span className="text-xs font-medium text-gray-700">
                  {Math.round(progress)}%
                </span>
              </div>
            </div>
          )}
          
          {isError && (
            <div className="flex items-center gap-1.5 mt-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span>{file.error || 'Conversion failed'}</span>
            </div>
          )}
          
          {isDone && (
            <div className="flex items-center gap-1.5 mt-2 text-sm text-emerald-600">
              <Check className="w-4 h-4" />
              <span>Ready to download</span>
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {isDone && file.resultUrl && (
            <button
              onClick={onDownload}
              className="btn-primary text-sm !py-2 !px-4"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          )}
          
          <button
            onClick={onRemove}
            className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================
// MAIN APP
// ============================================
function App() {
  const [files, setFiles] = useState<PDFFile[]>([])
  const [activeTab, setActiveTab] = useState<ToolType>('convert')
  const [splitPages, setSplitPages] = useState('')

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const pdfFiles = acceptedFiles.filter(file => file.type === 'application/pdf')
    addFiles(pdfFiles)
  }, [activeTab, files.length])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: activeTab === 'merge'
  })

  const addFiles = (newFiles: File[]) => {
    const maxFiles = activeTab === 'merge' ? 10 : 1
    const remainingSlots = maxFiles - files.length
    
    if (remainingSlots <= 0) {
      alert(`Maximum ${maxFiles} file(s) allowed`)
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

    if (!response.ok) throw new Error('Conversion failed')

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
    if (!splitPages) throw new Error('Please specify pages')

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

    if (!response.ok) throw new Error('Split failed')

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)

    setFiles(prev => prev.map(f => 
      f.id === pdfFile.id ? { ...f, status: 'done', progress: 100, resultUrl: url } : f
    ))
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

  const tools = [
    { id: 'convert' as ToolType, label: 'PDF to Word', description: 'Convert PDF to editable Word document', icon: FileUp },
    { id: 'merge' as ToolType, label: 'Merge PDFs', description: 'Combine multiple PDFs into one', icon: Combine },
    { id: 'split' as ToolType, label: 'Split PDF', description: 'Extract specific pages from PDF', icon: Scissors },
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">SimplePDF</h1>
              <p className="text-xs text-gray-500 font-medium">Free PDF Tools</p>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-16 pb-10 bg-gradient-radial">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="mb-6">
            <div className="section-badge">
              <div className="section-badge-dot" />
              <span>Free Forever</span>
            </div>
          </div>
          
          <h2 className="text-5xl sm:text-6xl font-extrabold text-gray-900 mb-6 tracking-tight">
            Convert PDF Files
            <br />
            <span className="gradient-text">In Seconds</span>
          </h2>
          
          <p className="text-lg text-gray-600 max-w-xl mx-auto mb-8">
            The simplest PDF converter. No ads, no watermarks, completely free.
          </p>
          
          <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span>Secure & Private</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-violet-500" />
              <span>Auto-delete in 1 hour</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pb-20">
        {/* Tool Selection */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {tools.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              isActive={activeTab === tool.id}
              onClick={() => {
                setActiveTab(tool.id)
                setFiles([])
                setSplitPages('')
              }}
              icon={tool.icon}
            />
          ))}
        </div>

        {/* Split Pages Input */}
        {activeTab === 'split' && (
          <div className="modern-card p-5 mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Pages to Extract
            </label>
            <input
              type="text"
              value={splitPages}
              onChange={(e) => setSplitPages(e.target.value)}
              placeholder="e.g., 1,3,5-10 or 1-5"
              className="input-modern"
            />
            <p className="text-xs text-gray-400 mt-2">
              Enter page numbers separated by commas, or ranges with hyphens
            </p>
          </div>
        )}

        {/* Upload Area */}
        <div
          {...getRootProps()}
          className={`dropzone flex flex-col items-center justify-center p-10 ${isDragActive ? 'active' : ''}`}
          style={{ minHeight: files.length > 0 ? '180px' : '300px' }}
        >
          <input {...getInputProps()} />
          
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center mb-6 shadow-lg shadow-violet-500/25">
            <Upload className="w-10 h-10 text-white" />
          </div>
          
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            {files.length > 0 ? 'Add more PDFs' : 'Drop your PDF here'}
          </h3>
          
          <p className="text-gray-500 mb-6">
            or click to browse from your computer
          </p>
          
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <FileCheck className="w-4 h-4" />
            <span>Max 50MB per file</span>
          </div>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="mt-8 space-y-4">
            {/* Merge Button */}
            {activeTab === 'merge' && files.length >= 2 && (
              <div className="text-center mb-6">
                <button
                  onClick={mergeAllPDFs}
                  className="btn-primary"
                >
                  <Combine className="w-5 h-5" />
                  Merge {files.length} PDF{files.length > 1 ? 's' : ''}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* File Cards */}
            <div className="space-y-3">
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
            </div>

            {/* Clear All */}
            {files.some(f => f.status === 'done' || f.status === 'error') && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={clearAllFiles}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear all
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Features Section */}
      <section className="border-t border-gray-100 bg-gray-50/50 py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <div className="section-badge mb-6">
              <Sparkles className="w-4 h-4" />
              <span>Why Choose Us</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900">
              Simple, Fast, <span className="gradient-text">Secure</span>
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="feature-card">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center mb-4">
                <Zap className="w-7 h-7 text-violet-600" />
              </div>
              <h3 className="font-semibold text-lg text-gray-900 mb-2">Lightning Fast</h3>
              <p className="text-sm text-gray-500 leading-relaxed">Convert your files in seconds with our optimized processing engine.</p>
            </div>
            <div className="feature-card">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center mb-4">
                <Shield className="w-7 h-7 text-violet-600" />
              </div>
              <h3 className="font-semibold text-lg text-gray-900 mb-2">Privacy First</h3>
              <p className="text-sm text-gray-500 leading-relaxed">Your files are automatically deleted after 1 hour. We never store your data.</p>
            </div>
            <div className="feature-card">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center mb-4">
                <FileCheck className="w-7 h-7 text-violet-600" />
              </div>
              <h3 className="font-semibold text-lg text-gray-900 mb-2">100% Free</h3>
              <p className="text-sm text-gray-500 leading-relaxed">No hidden fees, no credit card required. Use all features for free, forever.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900">SimplePDF</span>
            </div>
            <p className="text-sm text-gray-400">
              © 2025 SimplePDF. Free PDF tools for everyone.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
