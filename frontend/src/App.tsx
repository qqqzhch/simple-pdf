import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import { filesize } from 'filesize'
import { 
  Upload, FileText, Download, X, Check, Loader2, 
  FileUp, Combine, Scissors, Zap, ArrowRight,
  FileCheck, Trash2, AlertCircle, Shield, Clock, Sparkles
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

interface Tool {
  id: ToolType
  label: string
  description: string
  icon: React.ElementType
}

// ============================================
// CONSTANTS
// ============================================
const tools: Tool[] = [
  {
    id: 'convert',
    label: 'PDF to Word',
    description: 'Convert PDF to editable Word document',
    icon: FileUp,
  },
  {
    id: 'merge',
    label: 'Merge PDFs',
    description: 'Combine multiple PDFs into one',
    icon: Combine,
  },
  {
    id: 'split',
    label: 'Split PDF',
    description: 'Extract specific pages from PDF',
    icon: Scissors,
  },
]

// ============================================
// HOOKS
// ============================================
const useSimulatedProgress = (
  status: PDFFile['status'],
  targetProgress: number
) => {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (status === 'done') {
      setProgress(100)
      return
    }
    if (status === 'error') return
    
    if (status === 'uploading' || status === 'processing') {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= targetProgress) {
            clearInterval(interval)
            return targetProgress
          }
          const increment = Math.max(0.5, (targetProgress - prev) * 0.08)
          return Math.min(prev + increment, targetProgress)
        })
      }, 100)
      return () => clearInterval(interval)
    }
  }, [status, targetProgress])

  return progress
}

const formatTimeRemaining = (progress: number): string => {
  if (progress >= 95) return 'Almost done...'
  if (progress >= 80) return 'About 5s left'
  if (progress >= 60) return 'About 10s left'
  return 'Processing...'
}

// ============================================
// COMPONENTS
// ============================================

// Tool Card
const ToolCard = ({ tool, isActive, onClick }: { tool: Tool; isActive: boolean; onClick: () => void }) => {
  const Icon = tool.icon
  
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      className={`tool-card ${isActive ? 'active' : ''}`}
    >
      <div className="icon-container mb-4">
        <Icon className="w-6 h-6 text-white" />
      </div>
      
      <h3 className="font-semibold text-lg text-white mb-1">
        {tool.label}
      </h3>
      
      <p className="text-sm text-white/50">
        {tool.description}
      </p>
    </motion.button>
  )
}

// Upload Zone
const UploadZone = ({ 
  isDragActive, 
  hasFiles, 
  getRootProps, 
  getInputProps 
}: { 
  isDragActive: boolean
  hasFiles: boolean
  getRootProps: any
  getInputProps: any
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`dropzone flex flex-col items-center justify-center p-10 ${isDragActive ? 'active' : ''}`}
    style={{ minHeight: hasFiles ? '180px' : '300px' }}
    {...getRootProps()}
  >
    <input {...getInputProps()} />
    
    <motion.div
      animate={isDragActive ? { scale: 1.1, y: -8 } : { scale: 1, y: 0 }}
      className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center mb-6 shadow-lg shadow-violet-500/30"
    >
      <Upload className="w-10 h-10 text-white" />
    </motion.div>
    
    <h3 className="text-2xl font-bold text-white mb-2">
      {hasFiles ? 'Add more PDFs' : 'Drop your PDF here'}
    </h3>
    
    <p className="text-white/50 mb-6">
      or click to browse from your computer
    </p>
    
    <div className="flex items-center gap-2 text-sm text-white/40">
      <FileCheck className="w-4 h-4" />
      <span>Max 50MB per file</span>
    </div>
  </motion.div>
)

// File Card
const FileCard = ({ file, index, onRemove, onDownload }: { 
  file: PDFFile
  index: number
  onRemove: () => void
  onDownload: () => void
}) => {
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
      className="glass-card p-5"
    >
      <div className="flex items-center gap-4">
        {/* File Icon */}
        <div className="relative shrink-0">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 border border-violet-500/30 flex items-center justify-center">
            <FileText className="w-6 h-6 text-violet-400" />
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
            <p className="font-medium text-white truncate">
              {file.name}
            </p>
            <span className="text-xs text-white/40 shrink-0">
              {filesize(file.size)}
            </span>
          </div>
          
          {isProcessing && (
            <div className="mt-3">
              <div className="progress-container">
                <motion.div
                  className="progress-bar"
                  initial={{ width: 0 }}
                  animate={{ width: `${simulatedProgress}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" />
                  <span className="text-xs text-white/50">
                    {file.status === 'uploading' ? 'Uploading...' : 'Converting...'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/30">
                    {formatTimeRemaining(simulatedProgress)}
                  </span>
                  <span className="text-xs font-medium text-white/70 min-w-[36px] text-right">
                    {Math.round(simulatedProgress)}%
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {isError && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-1.5 mt-2 text-sm text-red-400"
            >
              <AlertCircle className="w-4 h-4" />
              <span>{file.error || 'Conversion failed'}</span>
            </motion.div>
          )}
          
          {isDone && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-1.5 mt-2 text-sm text-emerald-400"
            >
              <Check className="w-4 h-4" />
              <span>Ready to download</span>
            </motion.div>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <AnimatePresence>
            {isDone && file.resultUrl && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onDownload}
                className="btn-primary text-sm py-2 px-4"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </motion.button>
            )}
          </AnimatePresence>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onRemove}
            className="w-10 h-10 flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

// Feature Card
const FeatureCard = ({ icon: Icon, title, description }: { 
  icon: React.ElementType
  title: string
  description: string
}) => (
  <motion.div
    whileHover={{ y: -4 }}
    className="glass-card p-6 text-center"
  >
    <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 border border-violet-500/30 flex items-center justify-center mb-4">
      <Icon className="w-7 h-7 text-violet-400" />
    </div>
    <h3 className="font-semibold text-lg text-white mb-2">{title}</h3>
    <p className="text-sm text-white/50 leading-relaxed">{description}</p>
  </motion.div>
)

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
    multiple: activeTab === 'merge',
    noClick: files.length > 0
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
    if (!splitPages) throw new Error('Please specify pages to extract')

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

      if (!response.ok) throw new Error('Merge failed')

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

  const showUploadArea = files.length === 0 || activeTab === 'merge'

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      {/* Background Effects */}
      <div className="bg-grid absolute inset-0" />
      <div className="glow-purple -top-40 -right-40" />
      <div className="glow-blue bottom-0 -left-40" />
      
      {/* Header */}
      <header className="relative z-10 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">SimplePDF</h1>
              <p className="text-xs text-white/50 font-medium">Free PDF Tools</p>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="section-badge">
              <div className="section-badge-dot" />
              <span>Free Forever</span>
            </div>
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight"
          >
            <span className="text-white">Convert PDF</span>
            <br />
            <span className="gradient-text-hero">Files in Seconds</span>
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-white/60 max-w-xl mx-auto mb-8"
          >
            The simplest PDF converter. No ads, no watermarks, completely free.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center gap-6 text-sm text-white/50"
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Secure & Private</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-violet-400" />
              <span>Auto-delete in 1 hour</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pb-20">
        {/* Tool Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid md:grid-cols-3 gap-4 mb-8"
        >
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
            />
          ))}
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
              <div className="glass-card p-5">
                <label className="block text-sm font-medium text-white mb-3">
                  Pages to Extract
                </label>
                <input
                  type="text"
                  value={splitPages}
                  onChange={(e) => setSplitPages(e.target.value)}
                  placeholder="e.g., 1,3,5-10 or 1-5"
                  className="input-dark"
                />
                <p className="text-xs text-white/40 mt-2">
                  Enter page numbers separated by commas, or ranges with hyphens
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload Area */}
        <AnimatePresence>
          {showUploadArea && (
            <UploadZone
              isDragActive={isDragActive}
              hasFiles={files.length > 0}
              getRootProps={getRootProps}
              getInputProps={getInputProps}
            />
          )}
        </AnimatePresence>

        {/* File List */}
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-8 space-y-4"
            >
              {/* Merge Button */}
              {activeTab === 'merge' && files.length >= 2 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center mb-6"
                >
                  <motion.button
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={mergeAllPDFs}
                    className="btn-primary"
                  >
                    <Combine className="w-5 h-5" />
                    <span>Merge {files.length} PDF{files.length > 1 ? 's' : ''}</span>
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </motion.div>
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
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-center pt-4"
                >
                  <button
                    onClick={clearAllFiles}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-white/50 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
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

      {/* Features Section */}
      <section className="relative z-10 border-t border-white/10 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <div className="section-badge mb-6">
              <Sparkles className="w-4 h-4" />
              <span>Why Choose Us</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold">
              <span className="text-white">Simple, Fast, </span>
              <span className="gradient-text">Secure</span>
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={Zap}
              title="Lightning Fast"
              description="Convert your files in seconds with our optimized processing engine. No waiting, no queues."
            />
            <FeatureCard
              icon={Shield}
              title="Privacy First"
              description="Your files are automatically deleted from our servers after 1 hour. We never store your data."
            />
            <FeatureCard
              icon={FileCheck}
              title="100% Free"
              description="No hidden fees, no credit card required. Use all features for free, forever."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-white">SimplePDF</span>
            </div>
            <p className="text-sm text-white/40">
              © 2025 SimplePDF. Free PDF tools for everyone.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
