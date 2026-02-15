import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import { filesize } from 'filesize'
import { 
  Upload, FileText, Download, X, Check, Loader2, 
  FileUp, Combine, Scissors, Zap, ArrowRight,
  FileCheck, Trash2, AlertCircle, Shield, Clock
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
  if (progress >= 40) return 'About 20s left'
  return 'Processing...'
}

// ============================================
// COMPONENTS
// ============================================

// Section Label Badge
const SectionLabel = ({ text }: { text: string }) => (
  <div className="section-label">
    <span className="section-label-dot animate-pulse-slow" />
    <span className="section-label-text">{text}</span>
  </div>
)

// Tool Card
interface ToolCardProps {
  tool: Tool
  isActive: boolean
  onClick: () => void
}

const ToolCard = ({ tool, isActive, onClick }: ToolCardProps) => {
  const Icon = tool.icon
  
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`group relative w-full p-6 rounded-2xl border-2 text-left transition-all duration-300 ${
        isActive
          ? 'border-[#0052FF]/30 bg-[#0052FF]/5 shadow-lg'
          : 'border-[#E2E8F0] bg-white hover:border-[#64748B]/30 hover:shadow-md'
      }`}
    >
      <div className={`icon-gradient w-12 h-12 rounded-xl mb-4 transition-transform duration-300 ${
        isActive ? 'scale-110' : 'group-hover:scale-105'
      }`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      
      <h3 className={`font-semibold text-lg mb-1 transition-colors ${
        isActive ? 'text-[#0F172A]' : 'text-[#0F172A]/80'
      }`} style={{ fontFamily: 'Inter, sans-serif' }}>
        {tool.label}
      </h3>
      
      <p className="text-sm text-[#64748B]">
        {tool.description}
      </p>
      
      {isActive && (
        <motion.div
          layoutId="activeIndicator"
          className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[#0052FF]"
        />
      )}
    </motion.button>
  )
}

// Upload Zone
interface UploadZoneProps {
  isDragActive: boolean
  hasFiles: boolean
  toolColor: string
  onClick: () => void
  getRootProps: any
  getInputProps: any
}

const UploadZone = ({ 
  isDragActive, 
  hasFiles, 
  onClick, 
  getRootProps, 
  getInputProps 
}: UploadZoneProps) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.98 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.98 }}
  >
    <div
      {...getRootProps()}
      onClick={onClick}
      className={`dropzone flex flex-col items-center justify-center p-10 transition-all duration-300 ${
        isDragActive ? 'dropzone-active' : ''
      }`}
      style={{ minHeight: hasFiles ? '160px' : '320px' }}
    >
      <input {...getInputProps()} />
      
      <motion.div
        animate={isDragActive ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
        className="icon-gradient w-20 h-20 rounded-2xl mb-6"
      >
        <Upload className="w-10 h-10 text-white" />
      </motion.div>
      
      <h3 className="text-xl font-semibold text-[#0F172A] mb-2" style={{ fontFamily: 'Calistoga, Georgia, serif' }}>
        {hasFiles ? 'Add more PDFs' : 'Drop your PDF here'}
      </h3>
      
      <p className="text-[#64748B] mb-4">
        or click to browse
      </p>
      
      <div className="flex items-center gap-3 text-sm text-[#64748B]/70">
        <FileCheck className="w-4 h-4" />
        <span>Max 50MB</span>
      </div>
    </div>
  </motion.div>
)

// File Card
interface FileCardProps {
  file: PDFFile
  index: number
  onRemove: () => void
  onDownload: () => void
}

const FileCard = ({ file, index, onRemove, onDownload }: FileCardProps) => {
  const simulatedProgress = useSimulatedProgress(file.status, file.progress)
  const isProcessing = file.status === 'uploading' || file.status === 'processing'
  const isDone = file.status === 'done'
  const isError = file.status === 'error'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ delay: index * 0.05 }}
      className="card group"
    >
      <div className="flex items-start gap-4">
        {/* File Icon */}
        <div className="relative shrink-0">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#F1F5F9] to-white border border-[#E2E8F0] flex items-center justify-center">
            <FileText className="w-7 h-7 text-[#0052FF]" />
          </div>
          
          <AnimatePresence>
            {isDone && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="status-badge status-badge-success"
              >
                <Check className="w-3 h-3 text-white" />
              </motion.div>
            )}
            {isError && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="status-badge status-badge-error"
              >
                <X className="w-3 h-3 text-white" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <p className="font-semibold text-[#0F172A] truncate" style={{ fontFamily: 'Inter, sans-serif' }}>
              {file.name}
            </p>
            <span className="text-xs text-[#64748B] shrink-0">
              {filesize(file.size)}
            </span>
          </div>
          
          {/* Progress */}
          {isProcessing && (
            <div className="mt-3">
              <div className="progress-bar">
                <motion.div
                  className="progress-bar-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${simulatedProgress}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 text-[#0052FF] animate-spin" />
                  <span className="text-xs text-[#64748B]">
                    {file.status === 'uploading' ? 'Uploading...' : 'Converting...'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#64748B]/70">
                    {formatTimeRemaining(simulatedProgress)}
                  </span>
                  <span className="text-xs font-medium text-[#0F172A] min-w-[36px] text-right">
                    {Math.round(simulatedProgress)}%
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {/* Error */}
          {isError && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-1.5 mt-2 text-sm text-red-600"
            >
              <AlertCircle className="w-4 h-4" />
              <span>{file.error || 'Conversion failed'}</span>
            </motion.div>
          )}
          
          {/* Success */}
          {isDone && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-1.5 mt-2 text-sm text-emerald-600"
            >
              <Check className="w-4 h-4" />
              <span>Ready for download</span>
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
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onDownload}
                className="btn-primary text-sm"
              >
                <Download className="w-4 h-4" />
                Download
              </motion.button>
            )}
          </AnimatePresence>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onRemove}
            className="w-10 h-10 flex items-center justify-center text-[#64748B] hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

// Feature Card
interface FeatureCardProps {
  icon: React.ElementType
  title: string
  description: string
}

const FeatureCard = ({ icon: Icon, title, description }: FeatureCardProps) => (
  <motion.div
    whileHover={{ y: -4 }}
    className="card group"
  >
    <div className="icon-gradient w-12 h-12 rounded-xl mb-4 group-hover:scale-110 transition-transform duration-300">
      <Icon className="w-6 h-6 text-white" />
    </div>
    <h3 className="font-semibold text-lg text-[#0F172A] mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
      {title}
    </h3>
    <p className="text-sm text-[#64748B] leading-relaxed">
      {description}
    </p>
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

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: activeTab === 'merge',
    noClick: files.length > 0
  })

  const addFiles = (newFiles: File[]) => {
    const maxFiles = activeTab === 'merge' ? 10 : 1
    const currentCount = files.length
    const remainingSlots = maxFiles - currentCount
    
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
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#E2E8F0]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="icon-gradient w-10 h-10 rounded-xl">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#0F172A]" style={{ fontFamily: 'Calistoga, Georgia, serif' }}>
                SimplePDF
              </h1>
              <p className="text-xs text-[#64748B] font-medium">Free PDF Tools</p>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-12">
        {/* Background Glow */}
        <div className="glow-accent -top-40 -right-40" />
        
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <SectionLabel text="Free Forever" />
            </motion.div>
            
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl sm:text-6xl lg:text-7xl text-[#0F172A] mb-6 tracking-tight"
              style={{ fontFamily: 'Calistoga, Georgia, serif', lineHeight: 1.05 }}
            >
              Convert PDF Files
              <span className="block gradient-text">In Seconds</span>
            </motion.h2>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-[#64748B] max-w-xl mx-auto mb-8"
              style={{ fontFamily: 'Inter, sans-serif', lineHeight: 1.625 }}
            >
              The simplest PDF converter. No ads, no watermarks, completely free.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center justify-center gap-6 text-sm text-[#64748B]"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-500" />
                <span>Secure & Private</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#0052FF]" />
                <span>Auto-delete in 1 hour</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pb-24">
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
              <div className="card">
                <label className="block text-sm font-semibold text-[#0F172A] mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Pages to Extract
                </label>
                <input
                  type="text"
                  value={splitPages}
                  onChange={(e) => setSplitPages(e.target.value)}
                  placeholder="e.g., 1,3,5-10 or 1-5"
                  className="input-modern"
                />
                <p className="text-xs text-[#64748B] mt-2">
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
              toolColor="from-[#0052FF] to-[#4D7CFF]"
              onClick={() => open()}
              getRootProps={getRootProps}
              getInputProps={getInputProps}
            />
          )}
        </AnimatePresence>

        {/* File List */}
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
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
                    Merge {files.length} PDF{files.length > 1 ? 's' : ''}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </motion.button>
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
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#64748B] hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
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

      {/* Features Section (Inverted) */}
      <section className="section-inverted py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <SectionLabel text="Why Choose Us" />
            <h2 className="text-4xl sm:text-5xl mt-6" style={{ fontFamily: 'Calistoga, Georgia, serif' }}>
              Simple, Fast, <span className="gradient-text">Secure</span>
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
      <footer className="bg-white border-t border-[#E2E8F0] py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="icon-gradient w-8 h-8 rounded-lg">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-[#0F172A]" style={{ fontFamily: 'Calistoga, Georgia, serif' }}>
                SimplePDF
              </span>
            </div>
            <p className="text-sm text-[#64748B]">
              © 2025 SimplePDF. Free PDF tools for everyone.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
