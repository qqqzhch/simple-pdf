import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock fetch globally
;(globalThis as any).fetch = vi.fn()

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock URL methods
URL.createObjectURL = vi.fn(() => 'mock-url')
URL.revokeObjectURL = vi.fn()
