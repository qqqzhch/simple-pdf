import { useState, useCallback, useRef } from 'react'
import { 
  Upload, FileText, Download, X, Check, Loader2, 
  FileUp, Combine, Scissors, ArrowRight, Shield, Zap, 
  Clock, FileCheck, Trash2, GripVertical
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

function App() {
  const [files, setFiles] = useState<PDFFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [activeTab, setActiveTab] = useState<ToolType>('convert')
  const [splitPages, setSplitPages] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeTool = tools.find(t => t.id === activeTab)!

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.type === 'application/pdf'
    )
    
    addFiles(droppedFiles)
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []).filter(
      file => file.type === 'application/pdf'
    )
    
    addFiles(selectedFiles)
  }, [])

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

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

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
            
            <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 rounded-full p-1">
              {['Tools', 'Pricing', 'API'].map((item) => (
                <a
                  key={item}
                  href="#"
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-full hover:bg-white transition-all"
                >
                  {item}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-transparent"></div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-12">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-full text-sm text-blue-700 font-medium mb-6">
              <Zap className="w-4 h-4" />
              <span>Free forever, no registration required</span>
            </div>
            
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 tracking-tight">
              Convert PDF Files
              <span className="block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                In Seconds
              </span>
            </h2>
            
            <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-4">
              The simplest PDF converter. No ads, no watermarks, completely free.
            </p>
            
            <div className="flex items-center justify-center gap-6 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-500" />
                <span>Secure & Private</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <span>Auto-delete in 1 hour</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        {/* Tool Selection */}
        <div className="grid md:grid-cols-3 gap-4 mb-10">
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
                className={`group relative p-6 rounded-2xl border-2 text-left transition-all duration-300 ${
                  isActive
                    ? `${tool.bgColor} ${tool.borderColor} shadow-lg shadow-${tool.color.split('-')[1]}-500/10`
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                
                <h3 className={`font-bold text-lg mb-1 ${isActive ? 'text-slate-900' : 'text-slate-700'}`}>
                  {tool.label}
                </h3>
                
                <p className={`text-sm ${isActive ? 'text-slate-600' : 'text-slate-500'}`}>
                  {tool.description}
                </p>
                
                {isActive && (
                  <div className="absolute top-4 right-4">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Upload Section */}
        <div className="max-w-3xl mx-auto">
          {/* Split Pages Input */}
          {activeTab === 'split' && (
            <div className="mb-6 animate-fade-in">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
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
            </div>
          )}

          {/* Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative group cursor-pointer rounded-3xl border-2 border-dashed transition-all duration-300 ${
              isDragging
                ? `border-${activeTool.color.split('-')[1]}-500 bg-${activeTool.color.split('-')[1]}-50 scale-[1.02]`
                : 'border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50'
            }`}
            style={{ minHeight: '280px' }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              multiple={activeTab === 'merge'}
              onChange={handleFileInput}
              className="hidden"
            />
            
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${activeTool.color} flex items-center justify-center mb-6 shadow-xl group-hover:scale-110 transition-transform duration-300`}>
                <Upload className="w-10 h-10 text-white" />
              </div>
              
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                Drop your PDF here
              </h3>
              
              <p className="text-slate-500 text-center mb-4">
                or click to browse from your computer
              </p>
              
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <FileCheck className="w-4 h-4" />
                <span>Max file size: 50MB</span>
                {activeTab === 'merge' && (
                  <>
                    <span className="mx-2">•</span>
                    <span>Up to 10 files</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Merge Button */}
          {activeTab === 'merge' && files.length >= 2 && (
            <div className="mt-6 text-center">
              <button
                onClick={mergeAllPDFs}
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-2xl shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 hover:scale-105 transition-all"
              >
                <Combine className="w-5 h-5" />
                Merge {files.length} PDF{files.length > 1 ? 's' : ''}
              </button>
            </div>
          )}

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  Files ({files.length})
                </h3>
                <button
                  onClick={clearAllFiles}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear all
                </button>
              </div>

              <div className="space-y-3">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="group bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-4">
                      {activeTab === 'merge' && files.length > 1 && file.status !== 'done' && (
                        <div className="cursor-move text-slate-300">
                          <GripVertical className="w-5 h-5" />
                        </div>
                      )}
                      
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-orange-100 rounded-xl flex items-center justify-center">
                          <FileText className="w-6 h-6 text-red-500" />
                        </div>
                        {file.status === 'done' && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 truncate">
                          {file.name}
                        </p>
                        <p className="text-sm text-slate-500">
                          {formatSize(file.size)}
                        </p>
                        
                        {file.error && (
                          <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                            <X className="w-3 h-3" />
                            {file.error}
                          </p>
                        )}
                        
                        {file.status !== 'done' && file.status !== 'error' && (
                          <div className="mt-2">
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  file.status === 'processing'
                                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500'
                                    : 'bg-slate-300'
                                }`}
                                style={{ width: `${file.progress}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-xs text-slate-500">
                                {file.status === 'uploading' && 'Uploading...'}
                                {file.status === 'processing' && 'Processing...'}
                              </p>
                              <p className="text-xs font-medium text-slate-600">
                                {file.progress}%
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {file.status === 'done' && file.resultUrl && (
                          <button
                            onClick={() => downloadFile(
                              file.resultUrl!, 
                              file.name.replace('.pdf', activeTab === 'convert' ? '.docx' : '.pdf')
                            )}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-all"
                          >
                            <Download className="w-4 h-4" />
                            Download
                          </button>
                        )}
                        
                        {file.status === 'processing' && (
                          <div className="w-10 h-10 flex items-center justify-center">
                            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                          </div>
                        )}
                        
                        <button
                          onClick={() => removeFile(file.id)}
                          className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mt-20">
          {[
            {
              icon: Zap,
              title: 'Lightning Fast',
              desc: 'Convert your files in seconds with our optimized processing engine.',
              color: 'from-amber-400 to-orange-500'
            },
            {
              icon: Shield,
              title: 'Privacy First',
              desc: 'Your files are automatically deleted from our servers after 1 hour.',
              color: 'from-emerald-400 to-teal-500'
            },
            {
              icon: FileCheck,
              title: '100% Free',
              desc: 'No hidden fees, no credit card required. Use all features for free.',
              color: 'from-blue-400 to-indigo-500'
            }
          ].map((feature, i) => (
            <div key={i} className="group bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg hover:border-slate-300 transition-all">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">{feature.title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* How It Works */}
        <div className="mt-20">
          <h3 className="text-2xl font-bold text-center text-slate-900 mb-10">
            How It Works
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: 1, title: 'Upload', desc: 'Drag and drop your PDF files' },
              { step: 2, title: 'Convert', desc: 'We process your files securely' },
              { step: 3, title: 'Download', desc: 'Get your converted files instantly' }
            ].map((item) => (
              <div key={item.step} className="relative flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg mb-4 shadow-lg">
                  {item.step}
                </div>
                <h4 className="font-semibold text-slate-900 mb-2">{item.title}</h4>
                <p className="text-sm text-slate-500">{item.desc}</p>
                {item.step < 3 && (
                  <ArrowRight className="hidden md:block absolute top-6 -right-4 w-6 h-6 text-slate-300" />
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-slate-900">SimplePDF</span>
            </div>
            
            <p className="text-sm text-slate-500">
              © 2025 SimplePDF. Free PDF tools for everyone.
            </p>
            
            <div className="flex items-center gap-6 text-sm">
              <a href="#" className="text-slate-500 hover:text-slate-900 transition-colors">Privacy</a>
              <a href="#" className="text-slate-500 hover:text-slate-900 transition-colors">Terms</a>
              <a href="#" className="text-slate-500 hover:text-slate-900 transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
