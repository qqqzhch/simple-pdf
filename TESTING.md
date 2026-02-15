# SimplePDF Testing Guide

This project includes comprehensive automated tests for both frontend and backend.

## 📁 Test Structure

```
simple-pdf/
├── backend/
│   ├── test_main.py          # Backend API tests (pytest)
│   └── requirements.txt      # Includes test dependencies
│
├── frontend/
│   ├── src/
│   │   ├── App.test.tsx      # Component tests (Vitest)
│   │   └── test/
│   │       └── setup.ts      # Test configuration
│   │
│   ├── e2e/
│   │   └── simplepdf.spec.ts # E2E tests (Playwright)
│   │
│   ├── vitest.config.ts      # Vitest configuration
│   └── playwright.config.ts  # Playwright configuration
```

## 🧪 Running Tests

### Backend Tests (Python)

```bash
cd backend

# Create virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run all tests
pytest test_main.py -v

# Run specific test
pytest test_main.py::test_split_pdf_single_pages -v

# Run with coverage
pytest test_main.py --cov=main --cov-report=html
```

### Frontend Unit Tests (Vitest)

```bash
cd frontend

# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage
```

### E2E Tests (Playwright)

```bash
cd frontend

# Install Playwright browsers (first time only)
npx playwright install

# Run E2E tests
npx playwright test

# Run with UI mode (for debugging)
npx playwright test --ui

# Run specific test
npx playwright test simplepdf.spec.ts

# Generate report
npx playwright show-report
```

## 📝 Test Coverage

### Backend Tests
- ✅ Health check endpoint
- ✅ PDF info extraction
- ✅ Split PDF (single pages, ranges, mixed)
- ✅ Merge PDFs
- ✅ Convert PDF to Word
- ✅ Error handling (invalid files, empty pages, etc.)
- ✅ Edge cases (large files, out of range pages)

### Frontend Tests
- ✅ Component rendering
- ✅ Page selection logic
- ✅ Group generation algorithms
- ✅ State management

### E2E Tests
- ✅ Homepage navigation
- ✅ Tool selection flow
- ✅ File upload interaction
- ✅ Page selector UI
- ✅ Navigation between pages

## 🔧 Continuous Integration

To add to CI/CD pipeline (GitHub Actions example):

```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: |
          cd backend
          pip install -r requirements.txt
          pytest test_main.py -v

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: |
          cd frontend
          npm ci
          npm test
          npx playwright test
```

## 🐛 Debugging Tips

### Backend
- Tests run against actual FastAPI app using TestClient
- All file operations use temporary directories
- Tests clean up automatically

### Frontend
- Use `screen.debug()` to print DOM
- Use `await page.pause()` in E2E tests to pause execution
- Check browser console for errors

### E2E
- Run with `--headed` flag to see browser
- Use `await page.screenshot({ path: 'debug.png' })` for debugging
- Trace files saved in `test-results/`
