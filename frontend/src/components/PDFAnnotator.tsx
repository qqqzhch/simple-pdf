import { useState, useEffect, useRef, useCallback } from 'react'
import { PDFDocument, rgb as pdfRgb, StandardFonts } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'
import { ArrowLeft, Download, Type, Square, Highlighter, Trash2, ChevronLeft, ChevronRight, Pen, Underline, ArrowRight, StickyNote } from 'lucide-react'

// Set worker - use local worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

interface Annotation {
  id: string
  type: 'text' | 'rect' | 'highlight' | 'underline' | 'signature' | 'arrow' | 'sticky'
  x: number
  y: number
  width?: number
  height?: number
  content?: string
  imageData?: string // For signature
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
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null)
  const [textInput, setTextInput] = useState('')
  const [showTextInput, setShowTextInput] = useState(false)
  const [showSignaturePad, setShowSignaturePad] = useState(false)
  const [isDrawingSignature, setIsDrawingSignature] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSticky, setExpandedSticky] = useState<string | null>(null)
  const [stickyInput, setStickyInput] = useState('')
  
  // Drag state
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null)
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null)
  const renderTaskRef = useRef<any>(null)
  const pdfBytesRef = useRef<Uint8Array | null>(null)

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
        
        console.log('Loading PDF file:', file.name, 'size:', file.file.size)
        
        const arrayBuffer = await file.file.arrayBuffer()
        if (!arrayBuffer || arrayBuffer.byteLength === 0) {
          throw new Error('File is empty')
        }
        
        const bytes = new Uint8Array(arrayBuffer)
        console.log('PDF bytes loaded:', bytes.length, 'bytes')
        
        // Verify PDF header
        const header = String.fromCharCode(...bytes.slice(0, 5))
        console.log('PDF header:', header)
        
        if (header !== '%PDF-') {
          console.warn('PDF header warning:', header)
        }
        
        // Store in both state and ref
        setPdfBytes(bytes)
        pdfBytesRef.current = bytes
        
        const loadingTask = pdfjsLib.getDocument({ data: bytes })
        const pdf = await loadingTask.promise
        setPdfDoc(pdf)
        setTotalPages(pdf.numPages)
        
        console.log('PDF loaded successfully, pages:', pdf.numPages)
        
      } catch (err) {
        console.error('Error loading PDF:', err)
        setError('Failed to load PDF. Please try another file.')
      } finally {
        setIsLoading(false)
      }
    }
    loadPDF()
  }, [file])

  // Render PDF page
  useEffect(() => {
    const renderPDFPage = async () => {
      if (!pdfDoc || !pdfCanvasRef.current) return
      
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel()
      }
      
      try {
        const page = await pdfDoc.getPage(currentPage)
        const canvas = pdfCanvasRef.current
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const viewport = page.getViewport({ scale })
        canvas.width = viewport.width
        canvas.height = viewport.height
        setCanvasSize({ width: viewport.width, height: viewport.height })

        ctx.clearRect(0, 0, canvas.width, canvas.height)

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

  // Get mouse position relative to canvas
  const getMousePos = useCallback((e: React.MouseEvent | MouseEvent) => {
    const container = canvasContainerRef.current
    if (!container) return { x: 0, y: 0 }
    
    const rect = container.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }, [])

  // Handle mouse down for drag start
  const handleMouseDown = (e: React.MouseEvent, annotationId: string) => {
    e.stopPropagation()
    const ann = annotations.find(a => a.id === annotationId)
    if (!ann) return
    
    const mousePos = getMousePos(e)
    setDraggingId(annotationId)
    setDragOffset({
      x: mousePos.x - ann.x,
      y: mousePos.y - ann.y
    })
    setSelectedAnnotation(annotationId)
  }

  // Handle mouse move for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingId) return
      
      const mousePos = getMousePos(e)
      const newX = mousePos.x - dragOffset.x
      const newY = mousePos.y - dragOffset.y
      
      setAnnotations(prev => prev.map(ann => 
        ann.id === draggingId 
          ? { ...ann, x: Math.max(0, newX), y: Math.max(0, newY) }
          : ann
      ))
    }
    
    const handleMouseUp = () => {
      setDraggingId(null)
    }
    
    if (draggingId) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [draggingId, dragOffset, getMousePos])

  // Monitor pdfBytes changes
  useEffect(() => {
    console.log('pdfBytes updated:', pdfBytes ? pdfBytes.length : 'null')
  }, [pdfBytes])

  const handleExport = async () => {
    // Use ref instead of state to avoid React state issues
    const bytesToExport = pdfBytesRef.current
    
    if (!bytesToExport || bytesToExport.length === 0) {
      console.error('PDF bytes ref is empty')
      alert('PDF data is empty. Please reload the file.')
      return
    }
    
    try {
      console.log('Exporting PDF, bytes length:', bytesToExport.length)
      console.log('First 20 bytes:', Array.from(bytesToExport.slice(0, 20)))
      
      // Verify PDF header before loading
      const header = String.fromCharCode(...bytesToExport.slice(0, 5))
      console.log('PDF header at export:', header)
      
      if (header !== '%PDF-') {
        console.error('Invalid PDF header at export:', header)
        alert('PDF data is corrupted. Please reload the file.')
        return
      }
      
      const pdfDoc = await PDFDocument.load(bytesToExport)
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
          case 'underline':
            page.drawLine({
              start: { x: annotation.x, y: height - annotation.y },
              end: { x: annotation.x + (annotation.width || 200), y: height - annotation.y },
              thickness: 2,
              color: pdfRgb(
                parseInt(annotation.color.slice(1, 3), 16) / 255,
                parseInt(annotation.color.slice(3, 5), 16) / 255,
                parseInt(annotation.color.slice(5, 7), 16) / 255
              )
            })
            break
          case 'arrow':
            {
              const arrowWidth = annotation.width || 100
              const arrowColor = pdfRgb(
                parseInt(annotation.color.slice(1, 3), 16) / 255,
                parseInt(annotation.color.slice(3, 5), 16) / 255,
                parseInt(annotation.color.slice(5, 7), 16) / 255
              )
              // Draw arrow line
              page.drawLine({
                start: { x: annotation.x, y: height - annotation.y },
                end: { x: annotation.x + arrowWidth - 10, y: height - annotation.y },
                thickness: 3,
                color: arrowColor
              })
              // Draw arrow head (triangle)
              const headX = annotation.x + arrowWidth - 10
              const headY = height - annotation.y
              page.drawLine({
                start: { x: headX, y: headY },
                end: { x: headX - 8, y: headY - 6 },
                thickness: 3,
                color: arrowColor
              })
              page.drawLine({
                start: { x: headX, y: headY },
                end: { x: headX - 8, y: headY + 6 },
                thickness: 3,
                color: arrowColor
              })
            }
            break
          case 'sticky':
            {
              const stickyWidth = annotation.width || 150
              const stickyHeight = annotation.height || 100
              const stickyColor = pdfRgb(
                parseInt(annotation.color.slice(1, 3), 16) / 255,
                parseInt(annotation.color.slice(3, 5), 16) / 255,
                parseInt(annotation.color.slice(5, 7), 16) / 255
              )
              // Draw sticky note background
              page.drawRectangle({
                x: annotation.x,
                y: height - annotation.y - stickyHeight,
                width: stickyWidth,
                height: stickyHeight,
                color: stickyColor,
                opacity: 0.2
              })
              // Draw sticky note border
              page.drawRectangle({
                x: annotation.x,
                y: height - annotation.y - stickyHeight,
                width: stickyWidth,
                height: stickyHeight,
                borderColor: stickyColor,
                borderWidth: 2
              })
              // Draw text content
              if (annotation.content) {
                page.drawText(annotation.content, {
                  x: annotation.x + 8,
                  y: height - annotation.y - 8,
                  size: 12,
                  font: helveticaFont,
                  color: pdfRgb(0, 0, 0),
                  maxWidth: stickyWidth - 16,
                  lineHeight: 16
                })
              }
            }
            break
          case 'signature':
            if (annotation.imageData) {
              try {
                // Extract base64 data
                const base64Data = annotation.imageData.split(',')[1]
                const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
                const image = await pdfDoc.embedPng(imageBytes)
                
                page.drawImage(image, {
                  x: annotation.x,
                  y: height - annotation.y - (annotation.height || 100),
                  width: annotation.width || 200,
                  height: annotation.height || 100,
                })
              } catch (err) {
                console.error('Error embedding signature:', err)
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
    } catch (error: any) {
      console.error('Export error:', error)
      if (error.message && error.message.includes('No PDF header')) {
        alert('Export failed: Invalid PDF file. The file may be corrupted or not a valid PDF.')
      } else {
        alert('Export failed: ' + (error.message || 'Unknown error'))
      }
    }
  }

  const handleAddText = () => {
    if (!textInput.trim()) {
      setShowTextInput(false)
      return
    }
    
    // Place in center of page
    const centerX = canvasSize.width > 0 ? canvasSize.width / 2 - 50 : 200
    const centerY = canvasSize.height > 0 ? canvasSize.height / 2 - 20 : 300
    
    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      type: 'text',
      x: centerX,
      y: centerY,
      content: textInput,
      color: selectedColor,
      page: currentPage - 1
    }
    
    setAnnotations([...annotations, newAnnotation])
    setSelectedAnnotation(newAnnotation.id)
    setTextInput('')
    setShowTextInput(false)
  }

  const handleAddRect = () => {
    // Place in center of page
    const centerX = canvasSize.width > 0 ? canvasSize.width / 2 - 100 : 200
    const centerY = canvasSize.height > 0 ? canvasSize.height / 2 - 50 : 300
    
    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      type: 'rect',
      x: centerX,
      y: centerY,
      width: 200,
      height: 100,
      color: selectedColor,
      page: currentPage - 1
    }
    setAnnotations([...annotations, newAnnotation])
    setSelectedAnnotation(newAnnotation.id)
  }

  const handleAddHighlight = () => {
    // Place in center of page
    const centerX = canvasSize.width > 0 ? canvasSize.width / 2 - 150 : 150
    const centerY = canvasSize.height > 0 ? canvasSize.height / 2 - 15 : 300
    
    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      type: 'highlight',
      x: centerX,
      y: centerY,
      width: 300,
      height: 30,
      color: selectedColor,
      page: currentPage - 1
    }
    setAnnotations([...annotations, newAnnotation])
    setSelectedAnnotation(newAnnotation.id)
  }

  const handleAddUnderline = () => {
    // Place in center of page
    const centerX = canvasSize.width > 0 ? canvasSize.width / 2 - 150 : 150
    const centerY = canvasSize.height > 0 ? canvasSize.height / 2 - 15 : 300
    
    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      type: 'underline',
      x: centerX,
      y: centerY,
      width: 300,
      height: 3,
      color: selectedColor,
      page: currentPage - 1
    }
    setAnnotations([...annotations, newAnnotation])
    setSelectedAnnotation(newAnnotation.id)
  }

  const handleAddArrow = () => {
    // Place in center of page, pointing right
    const centerX = canvasSize.width > 0 ? canvasSize.width / 2 - 50 : 200
    const centerY = canvasSize.height > 0 ? canvasSize.height / 2 - 10 : 300
    
    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      type: 'arrow',
      x: centerX,
      y: centerY,
      width: 100,
      height: 20,
      color: selectedColor,
      page: currentPage - 1
    }
    setAnnotations([...annotations, newAnnotation])
    setSelectedAnnotation(newAnnotation.id)
  }

  const handleAddSticky = () => {
    // Place in center of page
    const centerX = canvasSize.width > 0 ? canvasSize.width / 2 - 75 : 200
    const centerY = canvasSize.height > 0 ? canvasSize.height / 2 - 50 : 300
    
    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      type: 'sticky',
      x: centerX,
      y: centerY,
      width: 150,
      height: 100,
      content: 'Click to edit...',
      color: selectedColor,
      page: currentPage - 1
    }
    setAnnotations([...annotations, newAnnotation])
    setSelectedAnnotation(newAnnotation.id)
    setExpandedSticky(newAnnotation.id)
    setStickyInput('Click to edit...')
  }

  const handleStickyClick = (id: string, content: string) => {
    setExpandedSticky(id)
    setStickyInput(content || '')
  }

  const handleSaveSticky = () => {
    if (expandedSticky) {
      setAnnotations(prev => prev.map(ann => 
        ann.id === expandedSticky 
          ? { ...ann, content: stickyInput || 'Click to edit...' }
          : ann
      ))
      setExpandedSticky(null)
      setStickyInput('')
    }
  }

  // Signature functions
  const handleStartSignature = () => {
    setShowSignaturePad(true)
    setIsDrawingSignature(false)
  }

  const handleClearSignature = () => {
    const canvas = signatureCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const handleSaveSignature = () => {
    const canvas = signatureCanvasRef.current
    if (!canvas) return
    
    // Check if signature is empty
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const isEmpty = imageData.data.every((pixel, index) => {
      // Check alpha channel (every 4th value)
      return index % 4 !== 3 || pixel === 0
    })
    
    if (isEmpty) {
      alert('Please draw your signature first')
      return
    }
    
    const dataUrl = canvas.toDataURL('image/png')
    
    const centerX = canvasSize.width > 0 ? canvasSize.width / 2 - 100 : 200
    const centerY = canvasSize.height > 0 ? canvasSize.height / 2 - 50 : 300
    
    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      type: 'signature',
      x: centerX,
      y: centerY,
      width: 200,
      height: 100,
      imageData: dataUrl,
      color: selectedColor,
      page: currentPage - 1
    }
    
    setAnnotations([...annotations, newAnnotation])
    setSelectedAnnotation(newAnnotation.id)
    setShowSignaturePad(false)
    handleClearSignature()
  }

  const handleSignatureMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.strokeStyle = selectedColor
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    
    setIsDrawingSignature(true)
  }

  const handleSignatureMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingSignature) return
    
    const canvas = signatureCanvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.stroke()
  }

  const handleSignatureMouseUp = () => {
    setIsDrawingSignature(false)
  }

  const handleDeleteAnnotation = (id: string) => {
    setAnnotations(annotations.filter(a => a.id !== id))
    if (selectedAnnotation === id) {
      setSelectedAnnotation(null)
    }
  }

  const handleClearAll = () => {
    if (confirm('Clear all annotations on this page?')) {
      setAnnotations(annotations.filter(a => a.page !== currentPage - 1))
      setSelectedAnnotation(null)
    }
  }

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
      setSelectedAnnotation(null)
    }
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
      setSelectedAnnotation(null)
    }
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
          
          <button
            onClick={handleAddUnderline}
            disabled={isLoading}
            className="p-2 sm:p-3 rounded-lg text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50"
            title="Add Underline"
          >
            <Underline className="w-5 h-5" />
          </button>
          
          <button
            onClick={handleAddArrow}
            disabled={isLoading}
            className="p-2 sm:p-3 rounded-lg text-slate-600 hover:bg-orange-50 hover:text-orange-600 disabled:opacity-50"
            title="Add Arrow"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          
          <button
            onClick={handleAddSticky}
            disabled={isLoading}
            className="p-2 sm:p-3 rounded-lg text-slate-600 hover:bg-pink-50 hover:text-pink-600 disabled:opacity-50"
            title="Add Sticky Note"
          >
            <StickyNote className="w-5 h-5" />
          </button>
          
          <button
            onClick={handleStartSignature}
            disabled={isLoading}
            className="p-2 sm:p-3 rounded-lg text-slate-600 hover:bg-purple-50 hover:text-purple-600 disabled:opacity-50"
            title="Add Signature"
          >
            <Pen className="w-5 h-5" />
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
              ref={canvasContainerRef}
              className="relative bg-white shadow-lg inline-block"
              style={{ width: canvasSize.width, height: canvasSize.height }}
            >
              {/* PDF Canvas - bottom layer */}
              <canvas
                ref={pdfCanvasRef}
                className="absolute top-0 left-0"
                style={{ width: canvasSize.width, height: canvasSize.height }}
              />
              
              {/* Annotation Layer - HTML elements for drag support */}
              {pageAnnotations.map((ann) => (
                <div
                  key={ann.id}
                  onMouseDown={(e) => handleMouseDown(e, ann.id)}
                  className={`absolute cursor-move select-none ${
                    selectedAnnotation === ann.id ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                  }`}
                  style={{
                    left: ann.x,
                    top: ann.y,
                    width: ann.width || 'auto',
                    height: ann.height || 'auto',
                  }}
                  title="Drag to move"
                >
                  {ann.type === 'text' && (
                    <span 
                      className="font-bold text-base whitespace-nowrap"
                      style={{ color: ann.color }}
                    >
                      {ann.content}
                    </span>
                  )}
                  {ann.type === 'rect' && (
                    <div
                      className="border-2"
                      style={{
                        width: ann.width || 100,
                        height: ann.height || 50,
                        borderColor: ann.color,
                      }}
                    />
                  )}
                  {ann.type === 'highlight' && (
                    <div
                      style={{
                        width: ann.width || 200,
                        height: ann.height || 30,
                        backgroundColor: ann.color + '66',
                      }}
                    />
                  )}
                  {ann.type === 'underline' && (
                    <div
                      style={{
                        width: ann.width || 200,
                        height: ann.height || 3,
                        backgroundColor: ann.color,
                        borderBottom: `3px solid ${ann.color}`,
                      }}
                    />
                  )}
                  {ann.type === 'arrow' && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        width: ann.width || 100,
                        height: ann.height || 20,
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          height: 3,
                          backgroundColor: ann.color,
                        }}
                      />
                      <div
                        style={{
                          width: 0,
                          height: 0,
                          borderTop: '8px solid transparent',
                          borderBottom: '8px solid transparent',
                          borderLeft: `12px solid ${ann.color}`,
                        }}
                      />
                    </div>
                  )}
                  {ann.type === 'sticky' && (
                    <div
                      className="p-3 rounded-lg shadow-md cursor-pointer overflow-hidden"
                      style={{
                        width: ann.width || 150,
                        height: ann.height || 100,
                        backgroundColor: ann.color + '20', // 12% opacity
                        border: `2px solid ${ann.color}`,
                      }}
                      onClick={() => handleStickyClick(ann.id, ann.content || '')}
                    >
                      <p className="text-sm text-slate-800 line-clamp-3">
                        {ann.content}
                      </p>
                    </div>
                  )}
                  {ann.type === 'signature' && ann.imageData && (
                    <img
                      src={ann.imageData}
                      alt="Signature"
                      style={{
                        width: ann.width || 200,
                        height: ann.height || 100,
                        objectFit: 'contain',
                      }}
                      draggable={false}
                    />
                  )}
                </div>
              ))}
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
            <p className="text-xs text-slate-400 mt-1">
              Click and drag to move
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
                  onClick={() => setSelectedAnnotation(ann.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${
                    selectedAnnotation === ann.id 
                      ? 'bg-blue-50 ring-1 ring-blue-500' 
                      : 'bg-slate-50 hover:bg-slate-100'
                  }`}
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
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteAnnotation(ann.id)
                    }}
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

      {/* Signature Pad Modal */}
      {showSignaturePad && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-semibold text-lg mb-4">Draw Your Signature</h3>
            <div className="border-2 border-slate-300 rounded-lg mb-4 bg-white">
              <canvas
                ref={signatureCanvasRef}
                width={350}
                height={150}
                className="cursor-crosshair w-full touch-none"
                onMouseDown={handleSignatureMouseDown}
                onMouseMove={handleSignatureMouseMove}
                onMouseUp={handleSignatureMouseUp}
                onMouseLeave={handleSignatureMouseUp}
              />
            </div>
            <div className="flex justify-between items-center">
              <button
                onClick={handleClearSignature}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Clear
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowSignaturePad(false)
                    handleClearSignature()
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSignature}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Save Signature
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Note Edit Modal */}
      {expandedSticky && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-semibold text-lg mb-4">Edit Sticky Note</h3>
            <textarea
              value={stickyInput}
              onChange={(e) => setStickyInput(e.target.value)}
              placeholder="Enter your note..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-4 resize-none h-32 focus:outline-none focus:border-blue-500"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setExpandedSticky(null)
                  setStickyInput('')
                }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSticky}
                className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
