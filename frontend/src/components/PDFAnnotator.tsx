import { useState, useEffect } from 'react'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { ArrowLeft, Download, Type, Square, Highlighter } from 'lucide-react'

interface Annotation {
  id: string
  type: 'text' | 'rect' | 'highlight'
  x: number
  y: number
  width: number
  height: number
  content?: string
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
  const [selectedTool, setSelectedTool] = useState<'text' | 'rect' | 'highlight' | null>(null)
  const [textInput, setTextInput] = useState('')
  const [showTextInput, setShowTextInput] = useState(false)

  useEffect(() => {
    const loadPDF = async () => {
      const arrayBuffer = await file.file.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      setPdfBytes(bytes)
      
      const pdfDoc = await PDFDocument.load(bytes)
      setTotalPages(pdfDoc.getPageCount())
    }
    loadPDF()
  }, [file])

  const handleExport = async () => {
    if (!pdfBytes) return
    
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
            y: height - annotation.y - 16,
            size: 16,
            font: helveticaFont,
            color: rgb(0, 0, 0)
          })
          break
          
        case 'rect':
          page.drawRectangle({
            x: annotation.x,
            y: height - annotation.y - annotation.height,
            width: annotation.width,
            height: annotation.height,
            borderColor: rgb(1, 0, 0),
            borderWidth: 2
          })
          break
          
        case 'highlight':
          page.drawRectangle({
            x: annotation.x,
            y: height - annotation.y - annotation.height,
            width: annotation.width,
            height: annotation.height,
            color: rgb(1, 1, 0),
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
  }

  const handleAddText = () => {
    if (!textInput.trim()) {
      setShowTextInput(false)
      return
    }
    
    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      type: 'text',
      x: 100,
      y: 100,
      width: textInput.length * 8,
      height: 20,
      content: textInput,
      page: 0
    }
    
    setAnnotations([...annotations, newAnnotation])
    setTextInput('')
    setShowTextInput(false)
    setSelectedTool(null)
  }

  const handleAddRect = () => {
    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      type: 'rect',
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      page: 0
    }
    setAnnotations([...annotations, newAnnotation])
    setSelectedTool(null)
  }

  const handleAddHighlight = () => {
    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      type: 'highlight',
      x: 100,
      y: 100,
      width: 300,
      height: 30,
      page: 0
    }
    setAnnotations([...annotations, newAnnotation])
    setSelectedTool(null)
  }

  const handleDeleteAnnotation = (id: string) => {
    setAnnotations(annotations.filter(a => a.id !== id))
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
              <h1 className="text-lg font-semibold text-slate-900">
                {file.name}
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500">
                {totalPages} page{totalPages > 1 ? 's' : ''}
              </span>
              <button
                onClick={handleExport}
                disabled={annotations.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Export PDF
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Toolbar */}
        <div className="w-16 bg-white border-r border-slate-200 min-h-screen py-4 flex flex-col items-center gap-2">
          <button
            onClick={() => {
              setSelectedTool('text')
              setShowTextInput(true)
            }}
            className={`p-3 rounded-lg ${selectedTool === 'text' ? 'bg-blue-100 text-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}
            title="Add Text"
          >
            <Type className="w-5 h-5" />
          </button>
          
          <button
            onClick={handleAddRect}
            className={`p-3 rounded-lg ${selectedTool === 'rect' ? 'bg-blue-100 text-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}
            title="Draw Rectangle"
          >
            <Square className="w-5 h-5" />
          </button>
          
          <button
            onClick={handleAddHighlight}
            className={`p-3 rounded-lg ${selectedTool === 'highlight' ? 'bg-blue-100 text-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}
            title="Highlight"
          >
            <Highlighter className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="bg-white shadow-lg rounded-lg p-8 max-w-4xl mx-auto">
            <h2 className="text-xl font-semibold mb-4">PDF Annotation Tool</h2>
            <p className="text-slate-600 mb-6">
              Add annotations to your PDF using the tools on the left. 
              All processing happens locally in your browser - your file never leaves your device.
            </p>
            
            {pdfBytes ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-green-800">
                  ✅ PDF loaded successfully ({(pdfBytes.length / 1024 / 1024).toFixed(2)} MB)
                </p>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
                <p className="text-slate-600">Loading PDF...</p>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="font-medium text-slate-900">Quick Actions:</h3>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setSelectedTool('text')
                    setShowTextInput(true)
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Text
                </button>
                <button
                  onClick={handleAddRect}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Add Rectangle
                </button>
                <button
                  onClick={handleAddHighlight}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                >
                  Add Highlight
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Annotations List */}
        <div className="w-64 bg-white border-l border-slate-200 min-h-screen p-4">
          <h3 className="font-semibold text-slate-900 mb-4">
            Annotations ({annotations.length})
          </h3>
          
          {annotations.length === 0 ? (
            <p className="text-sm text-slate-500">No annotations yet. Use the tools to add some!</p>
          ) : (
            <div className="space-y-2">
              {annotations.map((ann, index) => (
                <div
                  key={ann.id}
                  className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"
                >
                  <span className="text-sm capitalize">
                    {index + 1}. {ann.type}
                    {ann.content && ` - "${ann.content.substring(0, 20)}"`}
                  </span>
                  <button
                    onClick={() => handleDeleteAnnotation(ann.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Text Input Modal */}
      {showTextInput && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="font-semibold mb-4">Add Text Annotation</h3>
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Enter text to add..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-4"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleAddText()}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowTextInput(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleAddText}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
