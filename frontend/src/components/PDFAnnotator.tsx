import { useState, useEffect, useRef } from 'react'
import { PDFDocument, rgb as pdfRgb, StandardFonts } from 'pdf-lib'
import { 
  ArrowLeft, Download, Type, Square, Highlighter, 
  Pencil, Undo2, Trash2, Move, Circle
} from 'lucide-react'

interface Point {
  x: number
  y: number
}

interface Annotation {
  id: string
  type: 'text' | 'rect' | 'circle' | 'highlight' | 'signature' | 'arrow'
  x: number
  y: number
  width?: number
  height?: number
  content?: string
  points?: Point[]
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
  const [history, setHistory] = useState<Annotation[][]>([])
  const [selectedTool, setSelectedTool] = useState<'text' | 'rect' | 'circle' | 'highlight' | 'signature' | 'arrow' | null>(null)
  const [selectedColor, setSelectedColor] = useState('#000000')
  const [textInput, setTextInput] = useState('')
  const [showTextInput, setShowTextInput] = useState(false)
  
  // Drawing states
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPoints, setCurrentPoints] = useState<Point[]>([])
  const [startPos, setStartPos] = useState<Point>({ x: 0, y: 0 })
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const colors = [
    { name: 'Black', value: '#000000' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Yellow', value: '#eab308' },
  ]

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

  // Draw annotations on canvas
  useEffect(() => {
    drawCanvas()
  }, [annotations])

  const drawCanvas = () => {
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
      drawAnnotation(ctx, ann)
    })
  }

  const drawAnnotation = (ctx: CanvasRenderingContext2D, ann: Annotation) => {
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
        
      case 'circle':
        ctx.beginPath()
        ctx.arc(
          ann.x + (ann.width || 50) / 2, 
          ann.y + (ann.height || 50) / 2, 
          (ann.width || 100) / 2, 
          0, 
          Math.PI * 2
        )
        ctx.stroke()
        break
        
      case 'highlight':
        ctx.fillStyle = ann.color + '4D' // 30% opacity
        ctx.fillRect(ann.x, ann.y, ann.width || 200, ann.height || 30)
        break
        
      case 'signature':
      case 'arrow':
        if (ann.points && ann.points.length > 1) {
          ctx.beginPath()
          ctx.moveTo(ann.points[0].x, ann.points[0].y)
          for (let i = 1; i < ann.points.length; i++) {
            ctx.lineTo(ann.points[i].x, ann.points[i].y)
          }
          ctx.stroke()
        }
        break
    }
  }

  const saveToHistory = () => {
    setHistory([...history, annotations])
  }

  const handleUndo = () => {
    if (history.length > 0) {
      const previous = history[history.length - 1]
      setAnnotations(previous)
      setHistory(history.slice(0, -1))
    }
  }

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedTool) return
    
    const pos = getMousePos(e)
    setIsDrawing(true)
    setStartPos(pos)
    
    if (selectedTool === 'signature' || selectedTool === 'arrow') {
      setCurrentPoints([pos])
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !selectedTool) return
    
    const pos = getMousePos(e)
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Redraw everything
    drawCanvas()
    
    // Draw preview
    ctx.strokeStyle = selectedColor
    ctx.fillStyle = selectedColor
    ctx.lineWidth = 2
    
    switch (selectedTool) {
      case 'rect':
        ctx.strokeRect(
          startPos.x, 
          startPos.y, 
          pos.x - startPos.x, 
          pos.y - startPos.y
        )
        break
        
      case 'circle':
        const radius = Math.sqrt(
          Math.pow(pos.x - startPos.x, 2) + 
          Math.pow(pos.y - startPos.y, 2)
        ) / 2
        const centerX = (startPos.x + pos.x) / 2
        const centerY = (startPos.y + pos.y) / 2
        ctx.beginPath()
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
        ctx.stroke()
        break
        
      case 'highlight':
        ctx.fillStyle = selectedColor + '4D'
        ctx.fillRect(
          startPos.x, 
          startPos.y, 
          pos.x - startPos.x, 
          pos.y - startPos.y
        )
        break
        
      case 'signature':
      case 'arrow':
        setCurrentPoints([...currentPoints, pos])
        if (currentPoints.length > 0) {
          ctx.beginPath()
          ctx.moveTo(currentPoints[0].x, currentPoints[0].y)
          for (let i = 1; i < currentPoints.length; i++) {
            ctx.lineTo(currentPoints[i].x, currentPoints[i].y)
          }
          ctx.lineTo(pos.x, pos.y)
          ctx.stroke()
        }
        break
    }
  }

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !selectedTool) return
    
    const pos = getMousePos(e)
    setIsDrawing(false)
    
    saveToHistory()
    
    let newAnnotation: Annotation
    
    switch (selectedTool) {
      case 'rect':
        newAnnotation = {
          id: Date.now().toString(),
          type: 'rect',
          x: Math.min(startPos.x, pos.x),
          y: Math.min(startPos.y, pos.y),
          width: Math.abs(pos.x - startPos.x),
          height: Math.abs(pos.y - startPos.y),
          color: selectedColor,
          page: 0
        }
        setAnnotations([...annotations, newAnnotation])
        break
        
      case 'circle':
        const radius = Math.sqrt(
          Math.pow(pos.x - startPos.x, 2) + 
          Math.pow(pos.y - startPos.y, 2)
        ) / 2
        newAnnotation = {
          id: Date.now().toString(),
          type: 'circle',
          x: Math.min(startPos.x, pos.x),
          y: Math.min(startPos.y, pos.y),
          width: radius * 2,
          height: radius * 2,
          color: selectedColor,
          page: 0
        }
        setAnnotations([...annotations, newAnnotation])
        break
        
      case 'highlight':
        newAnnotation = {
          id: Date.now().toString(),
          type: 'highlight',
          x: Math.min(startPos.x, pos.x),
          y: Math.min(startPos.y, pos.y),
          width: Math.abs(pos.x - startPos.x),
          height: Math.abs(pos.y - startPos.y),
          color: selectedColor,
          page: 0
        }
        setAnnotations([...annotations, newAnnotation])
        break
        
      case 'signature':
      case 'arrow':
        if (currentPoints.length > 1) {
          newAnnotation = {
            id: Date.now().toString(),
            type: selectedTool,
            x: 0,
            y: 0,
            points: [...currentPoints, pos],
            color: selectedColor,
            page: 0
          }
          setAnnotations([...annotations, newAnnotation])
        }
        setCurrentPoints([])
        break
    }
    
    setSelectedTool(null)
  }

  const handleAddText = () => {
    if (!textInput.trim()) {
      setShowTextInput(false)
      return
    }
    
    saveToHistory()
    
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
    setSelectedTool(null)
  }

  const handleDeleteAnnotation = (id: string) => {
    saveToHistory()
    setAnnotations(annotations.filter(a => a.id !== id))
  }

  const handleClearAll = () => {
    saveToHistory()
    setAnnotations([])
  }

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
            y: height - annotation.y,
            size: 16,
            font: helveticaFont,
            color: hexToRgb(annotation.color)
          })
          break
          
        case 'rect':
          page.drawRectangle({
            x: annotation.x,
            y: height - annotation.y - (annotation.height || 50),
            width: annotation.width || 100,
            height: annotation.height || 50,
            borderColor: hexToRgb(annotation.color),
            borderWidth: 2
          })
          break
          
        case 'circle':
          const radius = (annotation.width || 100) / 2
          page.drawCircle({
            x: annotation.x + radius,
            y: height - annotation.y - radius,
            size: radius,
            borderColor: hexToRgb(annotation.color),
            borderWidth: 2
          })
          break
          
        case 'highlight':
          page.drawRectangle({
            x: annotation.x,
            y: height - annotation.y - (annotation.height || 30),
            width: annotation.width || 200,
            height: annotation.height || 30,
            color: hexToRgb(annotation.color),
            opacity: 0.3
          })
          break
          
        case 'signature':
        case 'arrow':
          if (annotation.points && annotation.points.length > 1) {
            // Draw path as multiple line segments
            for (let i = 0; i < annotation.points.length - 1; i++) {
              const p1 = annotation.points[i]
              const p2 = annotation.points[i + 1]
              page.drawLine({
                start: { x: p1.x, y: height - p1.y },
                end: { x: p2.x, y: height - p2.y },
                thickness: 2,
                color: hexToRgb(annotation.color)
              })
            }
          }
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

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) return pdfRgb(0, 0, 0)
    return pdfRgb(
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255
    )
  }

  const getToolIcon = (tool: string) => {
    switch (tool) {
      case 'text': return <Type className="w-5 h-5" />
      case 'rect': return <Square className="w-5 h-5" />
      case 'circle': return <Circle className="w-5 h-5" />
      case 'highlight': return <Highlighter className="w-5 h-5" />
      case 'signature': return <Pencil className="w-5 h-5" />
      case 'arrow': return <Move className="w-5 h-5" />
      default: return null
    }
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
              <button
                onClick={handleUndo}
                disabled={history.length === 0}
                className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50"
              >
                <Undo2 className="w-4 h-4" />
                Undo
              </button>
              <span className="text-sm text-slate-500">
                {totalPages} page{totalPages !== 1 ? 's' : ''} • {annotations.length} annotation{annotations.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={handleExport}
                disabled={annotations.length === 0}
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
        <div className="w-20 bg-white border-r border-slate-200 py-4 flex flex-col items-center gap-2 overflow-y-auto">
          <div className="text-xs text-slate-400 font-medium mb-2">TOOLS</div>
          
          {(['text', 'rect', 'circle', 'highlight', 'signature', 'arrow'] as const).map((tool) => (
            <button
              key={tool}
              onClick={() => {
                if (tool === 'text') {
                  setShowTextInput(true)
                }
                setSelectedTool(tool === selectedTool ? null : tool)
              }}
              className={`p-3 rounded-lg transition-colors ${
                selectedTool === tool 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              title={tool.charAt(0).toUpperCase() + tool.slice(1)}
            >
              {getToolIcon(tool)}
            </button>
          ))}
          
          <div className="flex-1" />
          
          <div className="text-xs text-slate-400 font-medium mb-2">COLOR</div>
          <div className="flex flex-col gap-1">
            {colors.map((c) => (
              <button
                key={c.value}
                onClick={() => setSelectedColor(c.value)}
                className={`w-8 h-8 rounded-full border-2 ${
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
        <div className="flex-1 bg-slate-100 overflow-auto p-8">
          <div 
            ref={containerRef}
            className="bg-white shadow-lg rounded-lg inline-block"
          >
            <canvas
              ref={canvasRef}
              width={800}
              height={1100}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className={`${selectedTool ? 'cursor-crosshair' : 'cursor-default'}`}
            />
          </div>
          
          <div className="mt-4 text-center text-sm text-slate-500">
            {selectedTool ? (
              <span>
                Drawing <strong>{selectedTool}</strong> - Drag on canvas to draw
              </span>
            ) : (
              <span>Select a tool from the left toolbar to start annotating</span>
            )}
          </div>
        </div>

        {/* Right Panel - Annotations List */}
        <div className="w-72 bg-white border-l border-slate-200 overflow-y-auto">
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
                  Select a tool and draw on the canvas
                </p>
              </div>
            ) : (
              annotations.map((ann, index) => (
                <div
                  key={ann.id}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div 
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: ann.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm capitalize">
                        {ann.type}
                      </span>
                      <span className="text-xs text-slate-400">
                        #{index + 1}
                      </span>
                    </div>
                    {ann.content && (
                      <p className="text-xs text-slate-500 truncate">
                        "{ann.content}"
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteAnnotation(ann.id)}
                    className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
          
          {/* Tips */}
          <div className="p-4 border-t border-slate-200 mt-auto">
            <h4 className="text-xs font-medium text-slate-500 mb-2">TIPS</h4>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>• Text: Click button to add</li>
              <li>• Shapes: Drag to draw</li>
              <li>• Signature: Freehand draw</li>
              <li>• All changes saved locally</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Text Input Modal */}
      {showTextInput && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-2xl">
            <h3 className="font-semibold text-lg mb-4">Add Text</h3>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Enter your text here..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-4 resize-none"
              rows={3}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleAddText()
                }
              }}
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
