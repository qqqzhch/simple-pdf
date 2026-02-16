import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PDFAnnotator from '../components/PDFAnnotator'

// Mock pdf-lib
vi.mock('pdf-lib', () => ({
  PDFDocument: {
    load: vi.fn().mockResolvedValue({
      getPages: vi.fn().mockReturnValue([{
        getSize: vi.fn().mockReturnValue({ width: 612, height: 792 }),
        drawText: vi.fn(),
        drawRectangle: vi.fn(),
        drawImage: vi.fn(),
      }]),
      embedFont: vi.fn().mockResolvedValue({}),
      embedPng: vi.fn().mockResolvedValue({}),
      save: vi.fn().mockResolvedValue(new Uint8Array()),
    }),
  },
  rgb: vi.fn().mockReturnValue({ r: 0, g: 0, b: 0 }),
  StandardFonts: { Helvetica: 'Helvetica' },
}))

// Mock pdfjs-dist
vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: vi.fn().mockReturnValue({
    promise: Promise.resolve({
      numPages: 1,
      getPage: vi.fn().mockResolvedValue({
        getViewport: vi.fn().mockReturnValue({ width: 600, height: 800 }),
        render: vi.fn().mockReturnValue({ promise: Promise.resolve() }),
      }),
    }),
  }),
}))

describe('PDFAnnotator', () => {
  const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })
  const mockOnBack = vi.fn()

  it('renders loading state initially', () => {
    render(<PDFAnnotator file={{ file: mockFile, name: 'test.pdf' }} onBack={mockOnBack} />)
    expect(screen.getByText('Loading PDF...')).toBeInTheDocument()
  })

  it('renders toolbar buttons', async () => {
    render(<PDFAnnotator file={{ file: mockFile, name: 'test.pdf' }} onBack={mockOnBack} />)
    
    await waitFor(() => {
      expect(screen.getByTitle('Add Text')).toBeInTheDocument()
      expect(screen.getByTitle('Add Rectangle')).toBeInTheDocument()
      expect(screen.getByTitle('Add Highlight')).toBeInTheDocument()
      expect(screen.getByTitle('Add Signature')).toBeInTheDocument()
    })
  })

  it('shows signature pad when signature button clicked', async () => {
    render(<PDFAnnotator file={{ file: mockFile, name: 'test.pdf' }} onBack={mockOnBack} />)
    
    await waitFor(() => {
      expect(screen.getByTitle('Add Signature')).toBeInTheDocument()
    })
    
    fireEvent.click(screen.getByTitle('Add Signature'))
    
    expect(screen.getByText('Draw Your Signature')).toBeInTheDocument()
    expect(screen.getByText('Clear')).toBeInTheDocument()
    expect(screen.getByText('Save Signature')).toBeInTheDocument()
  })

  it('closes signature pad when cancel clicked', async () => {
    render(<PDFAnnotator file={{ file: mockFile, name: 'test.pdf' }} onBack={mockOnBack} />)
    
    await waitFor(() => {
      expect(screen.getByTitle('Add Signature')).toBeInTheDocument()
    })
    
    fireEvent.click(screen.getByTitle('Add Signature'))
    expect(screen.getByText('Draw Your Signature')).toBeInTheDocument()
    
    fireEvent.click(screen.getByText('Cancel'))
    
    await waitFor(() => {
      expect(screen.queryByText('Draw Your Signature')).not.toBeInTheDocument()
    })
  })

  it('has color picker with 5 colors', async () => {
    render(<PDFAnnotator file={{ file: mockFile, name: 'test.pdf' }} onBack={mockOnBack} />)
    
    await waitFor(() => {
      const colorButtons = screen.getAllByRole('button').filter(
        btn => btn.getAttribute('title') && ['Red', 'Blue', 'Green', 'Black', 'Yellow'].includes(btn.getAttribute('title') || '')
      )
      expect(colorButtons.length).toBe(5)
    })
  })

  it('shows page navigation for multi-page PDFs', async () => {
    // Override mock for multi-page
    const { getDocument } = await import('pdfjs-dist')
    vi.mocked(getDocument).mockReturnValue({
      promise: Promise.resolve({
        numPages: 3,
        getPage: vi.fn().mockResolvedValue({
          getViewport: vi.fn().mockReturnValue({ width: 600, height: 800 }),
          render: vi.fn().mockReturnValue({ promise: Promise.resolve() }),
        }),
      }),
    } as any)
    
    render(<PDFAnnotator file={{ file: mockFile, name: 'test.pdf' }} onBack={mockOnBack} />)
    
    await waitFor(() => {
      expect(screen.getByText('1 / 3')).toBeInTheDocument()
    })
  })
})
