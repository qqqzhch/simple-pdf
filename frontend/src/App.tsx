import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
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
  status: 'uploading' | 'processing' | 'done' | 'error'
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
// HOME PAGE - 工具选择
// ============================================
function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Hero Section */}
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

      {/* Tools Grid */}
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

                  <div className="flex items-center text-blue-600 font-medium text-sm group-hover:gap-2 transition-all">
                    <span>Use Tool</span>
                    <ArrowLeft className="w-4 h-4 rotate-180 opacity-0 group-hover:opacity-100 transition-all" />
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
// TOOL PAGE - 工具详情页
// ============================================
function ToolPage() {
  const { toolId } = useParams<{ toolId: ToolType }>()
  const navigate = useNavigate()
  const tool = tools.find(t => t.id === toolId)
  
  const [files, setFiles] = useState<PDFFile[]>([])
  const [splitPages, setSplitPages] = useState('')

  if (!tool) {
    return <div>Tool not found</div>
  }

  const Icon = tool.icon

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const pdfFiles = acceptedFiles.filter(file => file.type === 'application/pdf')
    addFiles(pdfFiles)
  }, [toolId, files.length])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: tool.id === 'merge'
  })

  const addFiles = (newFiles: File[]) => {
    const remainingSlots = tool.acceptedFiles - files.length
    
    if (remainingSlots <= 0) {
      alert(`Maximum ${tool.acceptedFiles} file(s) allowed`)
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
    
    if (tool.id !== 'merge') {
      pdfFiles.forEach(processFile)
    }
  }

  const processFile = async (pdfFile: PDFFile) => {
    try {
      if (tool.id === 'convert') {
        await convertPDF(pdfFile)
      } else if (tool.id === 'split') {
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

  const downloadFile = (url: string, filename: string) => {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Tools</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tool Hero */}
      <section className="pt-12 pb-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br ${tool.color} flex items-center justify-center mb-6 shadow-xl`}
          >
            <Icon className="w-10 h-10 text-white" />
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl font-bold text-slate-900 mb-4"
          >
            {tool.label}
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-slate-600"
          >
            {tool.longDescription}
          </motion.p>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pb-20">
        {/* Split Pages Input */}
        {tool.id === 'split' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Pages to Extract (e.g., 1,3,5-10)
            </label>
            <input
              type="text"
              value={splitPages}
              onChange={(e) => setSplitPages(e.target.value)}
              placeholder="Enter page numbers or ranges"
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </motion.div>
        )}

        {/* Upload Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div
            {...getRootProps()}
            className={`relative group cursor-pointer rounded-3xl border-2 border-dashed transition-all duration-300 bg-white ${
              isDragActive
                ? `border-blue-500 bg-blue-50 scale-[1.02]`
                : 'border-slate-300 hover:border-blue-400'
            }`}
            style={{ minHeight: '360px' }}
          >
            <input {...getInputProps()} />
            
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
              <motion.div 
                animate={isDragActive ? { scale: 1.1, y: -8 } : { scale: 1, y: 0 }}
                className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${tool.color} flex items-center justify-center mb-6 shadow-xl`}
              >
                <Upload className="w-12 h-12 text-white" />
              </motion.div>
              
              <h3 className="text-2xl font-bold text-slate-900 mb-3">
                Select PDF file
              </h3>
              
              <p className="text-slate-500 text-center mb-2">
                or drag and drop your PDF here
              </p>
              
              <div className="flex items-center gap-2 text-sm text-slate-400 mt-4">
                <FileText className="w-4 h-4" />
                <span>Max 50MB • {tool.acceptedFiles === 1 ? '1 file' : 'Up to ' + tool.acceptedFiles + ' files'}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* File List */}
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 space-y-4"
          >
            {/* Merge Button */}
            {tool.id === 'merge' && files.length >= 2 && (
              <div className="text-center mb-6">
                <button
                  onClick={mergeAllPDFs}
                  className={`px-8 py-4 bg-gradient-to-r ${tool.color} text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all`}
                >
                  <Combine className="w-5 h-5 inline mr-2" />
                  Merge {files.length} PDFs
                </button>
              </div>
            )}

            {/* File Cards */}
            <div className="space-y-3">
              {files.map((file) => (
                <FileCard
                  key={file.id}
                  file={file}
                  tool={tool}
                  onRemove={() => removeFile(file.id)}
                  onDownload={() => downloadFile(file.resultUrl!, file.name.replace('.pdf', tool.outputExt))}
                />
              ))}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  )
}

// File Card Component
function FileCard({ file, tool, onRemove, onDownload }: { 
  file: PDFFile
  tool: ToolConfig
  onRemove: () => void
  onDownload: () => void
}) {
  const isProcessing = file.status === 'uploading' || file.status === 'processing'
  const isDone = file.status === 'done'
  const isError = file.status === 'error'

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
    >
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center`}>
            <FileText className="w-6 h-6 text-white" />
          </div>
          {isDone && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 truncate">{file.name}</p>
          <p className="text-sm text-slate-500">{filesize(file.size)}</p>
          
          {isProcessing && (
            <div className="mt-2">
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div 
                  className={`h-full rounded-full bg-gradient-to-r ${tool.color}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${file.progress}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-slate-500">
                  {file.status === 'uploading' ? 'Uploading...' : 'Processing...'}
                </span>
                <span className="text-xs font-medium text-slate-700">{Math.round(file.progress)}%</span>
              </div>
            </div>
          )}
          
          {isError && <p className="text-sm text-red-600 mt-1">{file.error}</p>}
          {isDone && <p className="text-sm text-emerald-600 mt-1">Ready for download</p>}
        </div>
        
        <div className="flex items-center gap-2">
          {isDone && (
            <button
              onClick={onDownload}
              className={`px-4 py-2 bg-gradient-to-r ${tool.color} text-white text-sm font-medium rounded-xl`}
            >
              <Download className="w-4 h-4 inline mr-1" />
              Download
            </button>
          )}
          <button
            onClick={onRemove}
            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
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
