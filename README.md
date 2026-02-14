# SimplePDF - Minimalist PDF Converter

A free, ad-free, no-signup PDF converter. Built for simplicity and speed.

## Features

- **PDF to Word** - Convert PDF to editable DOCX
- **PDF Merge** - Combine multiple PDFs
- **PDF Split** - Extract specific pages
- **Free Forever** - No hidden fees
- **No Ads** - Clean interface
- **No Registration** - Use instantly
- **Privacy First** - Files auto-delete after processing

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS
- Lucide React (icons)

### Backend
- FastAPI (Python)
- pdf2docx (PDF to Word conversion)
- PyPDF2 (PDF manipulation)

## Development

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
pip install -r requirements.txt
python main.py
```

## Deployment

### Frontend (Vercel)
1. Connect GitHub repo to Vercel
2. Build command: `npm run build`
3. Output directory: `dist`

### Backend (Railway/Render)
1. Connect GitHub repo
2. Dockerfile path: `backend/Dockerfile`
3. Environment: Python 3.11

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/convert/pdf-to-word` | POST | Convert PDF to Word |
| `/api/merge` | POST | Merge multiple PDFs |
| `/api/split` | POST | Split PDF by pages |
| `/api/health` | GET | Health check |

## Roadmap

- [x] Basic frontend UI
- [x] Backend API structure
- [ ] PDF to Word conversion
- [ ] PDF compression
- [ ] OCR text recognition
- [ ] Batch processing
- [ ] API for developers

## License

MIT License
