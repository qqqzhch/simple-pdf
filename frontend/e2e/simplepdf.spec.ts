import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('SimplePDF E2E Tests', () => {
  
  test('homepage has correct title and tools', async ({ page }) => {
    await page.goto('/')
    
    // Check title
    await expect(page).toHaveTitle(/SimplePDF/)
    
    // Check tools are displayed
    await expect(page.getByText('PDF to Word')).toBeVisible()
    await expect(page.getByText('Merge PDFs')).toBeVisible()
    await expect(page.getByText('Split PDF')).toBeVisible()
  })

  test('can navigate to Split PDF tool', async ({ page }) => {
    await page.goto('/')
    
    // Click on Split PDF
    await page.getByText('Split PDF').first().click()
    
    // Should navigate to tool page
    await expect(page).toHaveURL(/.*tool\/split/)
    await expect(page.getByText('Split PDF')).toBeVisible()
    await expect(page.getByText('Back to Tools')).toBeVisible()
  })

  test('Split PDF - can upload file and see page selector', async ({ page }) => {
    await page.goto('/tool/split')
    
    // Upload a test PDF
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R 4 0 R]\n/Count 2\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\n4 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000214 00000 n\ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n313\n%%EOF')
    })
    
    // Wait for analysis
    await expect(page.getByText(/Total pages:/)).toBeVisible({ timeout: 10000 })
  })

  test('Split PDF - page selector has correct buttons', async ({ page }) => {
    await page.goto('/tool/split')
    
    // Upload file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test5pages.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake-pdf-content')
    })
    
    // Mock the API response
    await page.route('**/api/pdf-info', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ filename: 'test5pages.pdf', pages: 5, size: 1024 })
      })
    })
    
    // Check for page selector elements
    await expect(page.getByText('Extract pages in groups')).toBeVisible()
    await expect(page.getByText('Every Page')).toBeVisible()
    await expect(page.getByText('Custom')).toBeVisible()
  })

  test('navigation - can go back to home', async ({ page }) => {
    await page.goto('/tool/split')
    
    // Click back button
    await page.getByText('Back to Tools').click()
    
    // Should be back on home
    await expect(page).toHaveURL('/')
    await expect(page.getByText('Every tool you need')).toBeVisible()
  })

  test('homepage - all tool cards are clickable', async ({ page }) => {
    await page.goto('/')
    
    const tools = ['PDF to Word', 'Merge PDFs', 'Split PDF']
    
    for (const tool of tools) {
      const card = page.getByText(tool).first()
      await expect(card).toBeVisible()
      await expect(card).toBeEnabled()
    }
  })
})
