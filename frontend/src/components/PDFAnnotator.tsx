import { useState, useEffect, useRef } from 'react'
import { PDFDocument, rgb as pdfRgb, StandardFonts } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'
import { ArrowLeft, Download, Type, Square, Highlighter, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'

// Set worker - use local worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

interface Annotation {
  id: string
  type: 'text' | 'rect' | 'highlight'
  x: number
  y: number
  width?: number
  height?: number
  content?: string
  color: string
  page: number
}

interface PDFFile {
  file: File
  name: string
}

interface PDFAnnotatorProps {
  file: PDFFile
  onBack: () => void
}

export default function PDFAnnotator({ file, onBack }: PDFAnnotatorProps) {
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null)
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [scale] = useState(1.5)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [selectedColor, setSelectedColor] = useState('#ef4444')
  const [textInput, setTextInput] = useState('')
  const [showTextInput, setShowTextInput] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null)
  const annotationCanvasRef = useRef<HTMLCanvasElement>(null)
  const renderTaskRef = useRef<any>(null)

  const colors = [
    { name: 'Red', value: '#ef4444' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Black', value: '#000000' },
    { name: 'Yellow', value: '#eab308' },
  ]

  // Load PDF
  useEffect(() => {
    const loadPDF = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const arrayBuffer = await file.file.arrayBuffer()
        const bytes = new Uint8Array(arrayBuffer)
        setPdfBytes(bytes)
        
        const loadingTask = pdfjsLib.getDocument({ data: bytes })
        const pdf = await loadingTask.promise
        setPdfDoc(pdf)
        setTotalPages(pdf.numPages)
        
      } catch (err) {
        console.error('Error loading PDF:', err)
        setError('Failed to load PDF. Please try another file.')
      } finally {
        setIsLoading(false)
      }
    }
    loadPDF()
  }, [file])

  // Render PDF page (only when pdfDoc or currentPage changes)
  useEffect(() => {
    const renderPDFPage = async () => {
      if (!pdfDoc || !pdfCanvasRef.current) return
      
      // Cancel previous render if exists
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel()
      }
      
      try {
        const page = await pdfDoc.getPage(currentPage)
        const canvas = pdfCanvasRef.current
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const viewport = page.getViewport({ scale })
        
        // Update canvas size
        canvas.width = viewport.width
        canvas.height = viewport.height
        
        // Also update annotation canvas
        if (annotationCanvasRef.current) {
          annotationCanvasRef.current.width = viewport.width
          annotationCanvasRef.current.height = viewport.height
        }
        
        setCanvasSize({ width: viewport.width, height: viewport.height })

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Render PDF page
        const renderTask = page.render({
          canvasContext: ctx,
          viewport: viewport,
          canvas: canvas
        } as any)
        
        renderTaskRef.current = renderTask
        await renderTask.promise
        renderTaskRef.current = null
        
      } catch (err: any) {
        if (err.name !== 'RenderingCancelledException') {
          console.error('Error rendering page:', err)
        }
      }
    }
    
    renderPDFPage()
    
    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel()
      }
    }
  }, [pdfDoc, currentPage, scale])

  // Draw annotations (when annotations or page changes)
  useEffect(() => {
    const canvas = annotationCanvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear annotation canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Get page annotations for current page
    const pageAnnotations = annotations.filter(a => a.page === currentPage - 1)
    
    // Draw annotations
    pageAnnotations.forEach(ann => {
      ctx.strokeStyle = ann.color
      ctx.fillStyle = ann.color
      ctx.lineWidth = 2
      
      switch (ann.type) {
        case 'text':
          ctx.font = 'bold 16px Arial'
          ctx.fillStyle = ann.color
          ctx.fillText(ann.content || '', ann.x, ann.y)
          break
        case 'rect':
          ctx.strokeStyle = ann.color
          ctx.lineWidth = 2
          ctx.strokeRect(ann.x, ann.y, ann.width || 100, ann.height || 50)
          break
        case 'highlight':
          ctx.fillStyle = ann.color + '66' // 40% opacity
          ctx.fillRect(ann.x, ann.y, ann.width || 200, ann.height || 30)
          break
      }
    })
  }, [annotations, currentPage])

  const handleExport = async () => {
    if (!pdfBytes) return
    
    try {
      const pdfDoc = await PDFDocument.load(pdfBytes)
      const pages = pdfDoc.getPages()
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
      
      for (const annotation of annotations) {
        const page = pages[annotation.page]
        const { height } = page.getSize()
        
        switch (annotation.type) {
          case 'text':
            page.drawText(annotation.content || '', {
              x: annotation.x,
              y: height - annotation.y,
              size: 16,
              font: helveticaFont,
              color: pdfRgb(0, 0, 0)
            })
            break
          case 'rect':
            page.drawRectangle({
              x: annotation.x,
              y: height - annotation.y - (annotation.height || 50),
              width: annotation.width || 100,
              height: annotation.height || 50,
              borderColor: pdfRgb(1, 0, 0),
              borderWidth: 2
            })
            break
          case 'highlight':
            page.drawRectangle({
              x: annotation.x,
              y: height - annotation.y - (annotation.height || 30),
              width: annotation.width || 200,
              height: annotation.height || 30,
              color: pdfRgb(1, 1, 0),
              opacity: 0.3
            })
            break
        }
      }
      
      const modifiedPdf = await pdfDoc.save()
      const blob = new Blob([modifiedPdf.buffer as ArrayBuffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = url
      a.download = `annotated_${file.name}`
      a.click()
      
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
      alert('Export failed. Please try again.')
    }
  }

  const handleAddText = () => {
    if (!textInput.trim()) {
      setShowTextInput(false)
      return
    }
    
    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      type: 'text',
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
      content: textInput,
      color: selectedColor,
      page: currentPage - 1
    }
    
    setAnnotations([...annotations, newAnnotation])
    setTextInput('')
    setShowTextInput(false)
  }

  const handleAddRect = () => {
    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      type: 'rect',
      x: 100 + Math.random() * 100,
      y: 100 + Math.random() * 100,
      width: 200,
      height: 100,
      color: selectedColor,
      page: currentPage - 1
    }
    setAnnotations([...annotations, newAnnotation])
  }

  const handleAddHighlight = () => {
    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      type: 'highlight',
      x: 100 + Math.random() * 100,
      y: 100 + Math.random() * 100,
      width: 300,
      height: 30,
      color: selectedColor,
      page: currentPage - 1
    }
    setAnnotations([...annotations, newAnnotation])
  }

  const handleDeleteAnnotation = (id: string) => {
    setAnnotations(annotations.filter(a => a.id !== id))
  }

  const handleClearAll = () => {
    if (confirm('Clear all annotations on this page?')) {
      setAnnotations(annotations.filter(a => a.page !== currentPage - 1))
    }
  }

  const goToPrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1)
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1)
  }

  const pageAnnotations = annotations.filter(a => a.page === currentPage - 1)

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
              <h1 className="text-lg font-semibold text-slate-900 truncate max-w-xs sm:max-w-md">
                {file.name}
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={goToPrevPage}
                    disabled={currentPage <= 1}
                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-sm text-slate-600">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={goToNextPage}
                    disabled={currentPage >= totalPages}
                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-50"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
              
              <span className="text-sm text-slate-500 hidden sm:inline">
                {pageAnnotations.length} on this page
              </span>
              
              <button
                onClick={handleExport}
                disabled={annotations.length === 0 || !pdfBytes}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Toolbar */}
        <div className="w-16 sm:w-20 bg-white border-r border-slate-200 py-4 flex flex-col items-center gap-2 overflow-y-auto flex-shrink-0">
          <div className="text-xs text-slate-400 font-medium mb-2">TOOLS</div>
          
          <button
            onClick={() => setShowTextInput(true)}
            disabled={isLoading}
            className="p-2 sm:p-3 rounded-lg text-slate-600 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50"
            title="Add Text"
          >
            <Type className="w-5 h-5" />
          </button>
          
          <button
            onClick={handleAddRect}
            disabled={isLoading}
            className="p-2 sm:p-3 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            title="Add Rectangle"
          >
            <Square className="w-5 h-5" />
          </button>
          
          <button
            onClick={handleAddHighlight}
            disabled={isLoading}
            className="p-2 sm:p-3 rounded-lg text-slate-600 hover:bg-yellow-50 hover:text-yellow-600 disabled:opacity-50"
            title="Add Highlight"
          >
            <Highlighter className="w-5 h-5" />
          </button>
          
          <div className="flex-1" />
          
          <div className="text-xs text-slate-400 font-medium mb-2">COLOR</div>
          <div className="flex flex-col gap-1 px-1">
            {colors.map((c) => (
              <button
                key={c.value}
                onClick={() => setSelectedColor(c.value)}
                className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 ${
                  selectedColor === c.value ? 'border-slate-800' : 'border-transparent'
                }`}
                style={{ backgroundColor: c.value }}
                title={c.name}
              />
            ))}
          </div>
          
          <div className="flex-1" />
          
          <button
            onClick={handleClearAll}
            disabled={pageAnnotations.length === 0}
            className="p-2 sm:p-3 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50"
            title="Clear Page"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 bg-slate-200 overflow-auto p-4 sm:p-8 flex items-start justify-center min-h-0">
          {isLoading ? (
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-slate-600">Loading PDF...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <p className="text-red-600 mb-2">{error}</p>
              <button
                onClick={onBack}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Go Back
              </button>
            </div>
          ) : (
            <div 
              className="relative bg-white shadow-lg inline-block"
              style={{ width: canvasSize.width, height: canvasSize.height }}
            >
              {/* PDF Canvas - bottom layer */}
              <canvas
                ref={pdfCanvasRef}
                className="absolute top-0 left-0"
                style={{ width: canvasSize.width, height: canvasSize.height }}
              />
              {/* Annotation Canvas - top layer */}
              <canvas
                ref={annotationCanvasRef}
                className="absolute top-0 left-0 pointer-events-none"
                style={{ width: canvasSize.width, height: canvasSize.height }}
              />
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="hidden lg:block w-64 bg-white border-l border-slate-200 overflow-y-auto">
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">
              Annotations ({pageAnnotations.length})
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Page {currentPage} of {totalPages}
            </p>
          </div>
          
          <div className="p-4 space-y-2">
            {pageAnnotations.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-slate-500 mb-2">No annotations on this page</p>
                <p className="text-xs text-slate-400">
                  Click tools on the left to add
                </p>
              </div>
            ) : (
              pageAnnotations.map((ann) => (
                <div
                  key={ann.id}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100"
                >
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: ann.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm capitalize font-medium">
                      {ann.type}
                    </span>
                    {ann.content && (
                      <p className="text-xs text-slate-500 truncate">
                        "{ann.content}"
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteAnnotation(ann.id)}
                    className="text-slate-400 hover:text-red-600 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Text Input Modal */}
      {showTextInput && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-semibold text-lg mb-4">Add Text Annotation</h3>
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Enter text..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-4 focus:outline-none focus:border-blue-500"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleAddText()}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowTextInput(false)
                  setTextInput('')
                }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleAddText}
                disabled={!textInput.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Add Text
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
