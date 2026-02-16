import { useState, useEffect, useRef } from 'react'
import { PDFDocument, rgb as pdfRgb, StandardFonts } from 'pdf-lib'
import { ArrowLeft, Download, Type, Square, Highlighter, Trash2 } from 'lucide-react'

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
  const [totalPages, setTotalPages] = useState(0)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [selectedColor, setSelectedColor] = useState('#000000')
  const [textInput, setTextInput] = useState('')
  const [showTextInput, setShowTextInput] = useState(false)
  
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const colors = [
    { name: 'Black', value: '#000000' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Yellow', value: '#eab308' },
  ]

  // Load PDF on mount
  useEffect(() => {
    const loadPDF = async () => {
      try {
        const arrayBuffer = await file.file.arrayBuffer()
        const bytes = new Uint8Array(arrayBuffer)
        setPdfBytes(bytes)
        
        const pdfDoc = await PDFDocument.load(bytes)
        setTotalPages(pdfDoc.getPageCount())
      } catch (error) {
        console.error('Error loading PDF:', error)
      }
    }
    loadPDF()
  }, [file])

  // Draw annotations on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Draw placeholder background
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Draw page outline
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 2
    ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100)
    
    // Draw annotations
    annotations.forEach(ann => {
      ctx.strokeStyle = ann.color
      ctx.fillStyle = ann.color
      ctx.lineWidth = 2
      
      switch (ann.type) {
        case 'text':
          ctx.font = '16px Arial'
          ctx.fillText(ann.content || '', ann.x, ann.y)
          break
        case 'rect':
          ctx.strokeRect(ann.x, ann.y, ann.width || 100, ann.height || 50)
          break
        case 'highlight':
          ctx.fillStyle = ann.color + '4D'
          ctx.fillRect(ann.x, ann.y, ann.width || 200, ann.height || 30)
          break
      }
    })
  }, [annotations])

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
      x: 200,
      y: 200,
      content: textInput,
      color: selectedColor,
      page: 0
    }
    
    setAnnotations([...annotations, newAnnotation])
    setTextInput('')
    setShowTextInput(false)
  }

  const handleAddRect = () => {
    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      type: 'rect',
      x: 200,
      y: 200,
      width: 200,
      height: 100,
      color: selectedColor,
      page: 0
    }
    setAnnotations([...annotations, newAnnotation])
  }

  const handleAddHighlight = () => {
    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      type: 'highlight',
      x: 200,
      y: 200,
      width: 300,
      height: 30,
      color: selectedColor,
      page: 0
    }
    setAnnotations([...annotations, newAnnotation])
  }

  const handleDeleteAnnotation = (id: string) => {
    setAnnotations(annotations.filter(a => a.id !== id))
  }

  const handleClearAll = () => {
    setAnnotations([])
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
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
              <h1 className="text-lg font-semibold text-slate-900 truncate max-w-md">
                {file.name}
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500">
                {totalPages} page{totalPages !== 1 ? 's' : ''} • {annotations.length} annotation{annotations.length !== 1 ? 's' : ''}
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

      <div className="flex h-[calc(100vh-64px)]">
        {/* Left Toolbar */}
        <div className="w-20 bg-white border-r border-slate-200 py-4 flex flex-col items-center gap-2">
          <div className="text-xs text-slate-400 font-medium mb-2">TOOLS</div>
          
          <button
            onClick={() => setShowTextInput(true)}
            className="p-3 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-blue-600"
            title="Add Text"
          >
            <Type className="w-5 h-5" />
          </button>
          
          <button
            onClick={handleAddRect}
            className="p-3 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-red-600"
            title="Add Rectangle"
          >
            <Square className="w-5 h-5" />
          </button>
          
          <button
            onClick={handleAddHighlight}
            className="p-3 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-yellow-600"
            title="Add Highlight"
          >
            <Highlighter className="w-5 h-5" />
          </button>
          
          <div className="flex-1" />
          
          <div className="text-xs text-slate-400 font-medium mb-2">COLOR</div>
          <div className="flex flex-col gap-1 px-2">
            {colors.map((c) => (
              <button
                key={c.value}
                onClick={() => setSelectedColor(c.value)}
                className={`w-6 h-6 rounded-full border-2 ${
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
            disabled={annotations.length === 0}
            className="p-3 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50"
            title="Clear All"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 bg-slate-100 overflow-auto p-8 flex items-center justify-center">
          <div className="bg-white shadow-lg rounded-lg p-4">
            <canvas
              ref={canvasRef}
              width={700}
              height={1000}
              className="border border-slate-200"
            />
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-64 bg-white border-l border-slate-200 overflow-y-auto">
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">
              Annotations ({annotations.length})
            </h3>
          </div>
          
          <div className="p-4 space-y-2">
            {annotations.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-slate-500 mb-2">No annotations yet</p>
                <p className="text-xs text-slate-400">
                  Click tools on the left to add annotations
                </p>
              </div>
            ) : (
              annotations.map((ann) => (
                <div
                  key={ann.id}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
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
                    className="text-slate-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
          
          <div className="p-4 border-t border-slate-200 mt-auto">
            <h4 className="text-xs font-medium text-slate-500 mb-2">HOW TO USE</h4>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>• Click tool buttons to add</li>
              <li>• Select color before adding</li>
              <li>• Click Export to download</li>
              <li>• All processing in browser</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Text Input Modal */}
      {showTextInput && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-2xl">
            <h3 className="font-semibold text-lg mb-4">Add Text Annotation</h3>
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Enter text..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-4"
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
