import { useState, useCallback } from 'react'
import { Upload, FileText, Download, X, Check, Loader2 } from 'lucide-react'

interface PDFFile {
  id: string
  file: File
  name: string
  size: number
  status: 'uploading' | 'processing' | 'done' | 'error'
  progress: number
  resultUrl?: string
}

function App() {
  const [files, setFiles] = useState<PDFFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [activeTab, setActiveTab] = useState<'convert' | 'merge' | 'split'>('convert')

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
    const pdfFiles: PDFFile[] = newFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      name: file.name,
      size: file.size,
      status: 'uploading',
      progress: 0
    }))
    
    setFiles(prev => [...prev, ...pdfFiles])
    
    // Simulate upload and processing
    pdfFiles.forEach((pdfFile, index) => {
      setTimeout(() => {
        setFiles(prev => prev.map(f => 
          f.id === pdfFile.id 
            ? { ...f, status: 'processing', progress: 50 }
            : f
        ))
        
        setTimeout(() => {
          setFiles(prev => prev.map(f => 
            f.id === pdfFile.id 
              ? { ...f, status: 'done', progress: 100 }
              : f
          ))
        }, 1500)
      }, 500 + index * 200)
    })
  }

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">SimplePDF</h1>
              <p className="text-xs text-gray-500">Free, No Ads, No Sign-up</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <a href="#" className="hover:text-primary-600">Tools</a>
            <a href="#" className="hover:text-primary-600">Pricing</a>
            <a href="#" className="hover:text-primary-600">API</a>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Convert PDF Files
          </h2>
          <p className="text-lg text-gray-600 mb-2">
            The simplest PDF converter. Free forever.
          </p>
          <p className="text-sm text-gray-500">
            No ads, no registration, no watermarks on converted files.
          </p>
        </div>

        {/* Tool Tabs */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-white rounded-lg p-1 shadow-sm border border-gray-200">
            {[
              { id: 'convert', label: 'Convert PDF' },
              { id: 'merge', label: 'Merge PDF' },
              { id: 'split', label: 'Split PDF' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Upload Area */}
        <div className="max-w-2xl mx-auto mb-12">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`dropzone ${isDragging ? 'dropzone-active' : ''}`}
          >
            <input
              type="file"
              accept=".pdf"
              multiple
              onChange={handleFileInput}
              className="hidden"
              id="file-input"
            />
            <label htmlFor="file-input" className="cursor-pointer">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                Drop your PDF here
              </p>
              <p className="text-sm text-gray-500 mb-4">
                or click to browse (max 50MB)
              </p>
              <button className="btn-primary">
                Select PDF Files
              </button>
            </label>
          </div>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Your Files ({files.length})
            </h3>
            <div className="space-y-3">
              {files.map(file => (
                <div key={file.id} className="card flex items-center gap-4">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-red-600" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatSize(file.size)}
                    </p>
                    
                    {/* Progress Bar */}
                    {file.status !== 'done' && (
                      <div className="mt-2">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary-600 transition-all duration-300"
                            style={{ width: `${file.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {file.status === 'uploading' && 'Uploading...'}
                          {file.status === 'processing' && 'Processing...'}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {file.status === 'done' && (
                      <>
                        <Check className="w-5 h-5 text-green-600" />
                        <button className="btn-secondary text-sm py-2 px-4">
                          <Download className="w-4 h-4 inline mr-1" />
                          Download
                        </button>
                      </>
                    )}
                    {file.status === 'processing' && (
                      <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
                    )}
                    <button 
                      onClick={() => removeFile(file.id)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mt-16">
          {[
            {
              title: 'Free Forever',
              desc: 'No hidden fees, no credit card required. All core features are free.'
            },
            {
              title: 'No Ads',
              desc: 'Clean interface without annoying ads. Focus on your work.'
            },
            {
              title: 'Privacy First',
              desc: 'Files are processed securely and deleted automatically after 1 hour.'
            }
          ].map((feature, i) => (
            <div key={i} className="card text-center">
              <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-600">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              © 2025 SimplePDF. Free PDF tools for everyone.
            </p>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <a href="#" className="hover:text-gray-900">Privacy</a>
              <a href="#" className="hover:text-gray-900">Terms</a>
              <a href="#" className="hover:text-gray-900">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
