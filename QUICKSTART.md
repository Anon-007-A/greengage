# Quick Start Guide - LMA Edge Platform

## 🚀 5-Minute Setup

### Step 1: Backend Setup

```bash
cd backend

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add: OPENAI_API_KEY=your_key_here

# Start server
uvicorn app.main:app --reload --port 8000
```

✅ Backend running at http://localhost:8000

### Step 2: Frontend Setup

```bash
cd greengauge

# Install dependencies
npm install

# Start dev server
npm run dev
```

✅ Frontend running at http://localhost:5173

## 🧪 Testing the Platform

### 1. Test Document Analysis

**Via API:**
```bash
curl -X POST "http://localhost:8000/api/v1/analyze-document" \
  -F "file=@your_lma_document.pdf" \
  -F "tenant_id=tenant-default"
```

**Via Frontend:**
- Navigate to Dashboard
- Upload a PDF (if upload UI exists)
- View extracted covenants

### 2. Test Covenant Breach Simulator

**Via API:**
```bash
curl -X POST "http://localhost:8000/api/v1/simulate-stress-test" \
  -H "Content-Type: application/json" \
  -d '{
    "ebitda_drop_percent": 20,
    "interest_rate_hike_bps": 100
  }'
```

**Via Frontend:**
1. Click **Simulator** in sidebar
2. Set EBITDA Drop: 20%
3. Set Interest Rate Hike: 100 bps
4. Click **Run Stress Test**
5. View risk heatmap

### 3. Test Export

**Via API:**
```bash
# Export compliance report
curl "http://localhost:8000/api/v1/export-compliance-report?format=excel" \
  --output report.xlsx
```

**Via Frontend:**
- Click Export button in Simulator results
- Download Excel file

## 📋 Sample Data

The frontend includes mock data for demonstration. To use real backend data:

1. Upload documents via `/analyze-document` endpoint
2. Update covenant values via `/covenants/{id}/value` endpoint
3. Run stress tests via `/simulate-stress-test` endpoint

## 🔍 API Documentation

Visit http://localhost:8000/docs for interactive API documentation.

## ⚠️ Troubleshooting

### Backend Issues

**Import errors:**
- Ensure virtual environment is activated
- Run `pip install -r requirements.txt` again

**Database errors:**
- SQLite database is created automatically
- For PostgreSQL, update `DATABASE_URL` in `.env`

**OpenAI API errors:**
- Verify `OPENAI_API_KEY` is set in `.env`
- Check API key is valid and has credits

### Frontend Issues

**API connection errors:**
- Verify backend is running on port 8000
- Check `VITE_API_BASE_URL` in `.env` (if set)

**Build errors:**
- Run `npm install` again
- Clear node_modules and reinstall

## 🎯 Next Steps

1. Upload your first LMA document
2. Run a stress test simulation
3. Export compliance report
4. Explore the risk heatmap

## 📞 Support

For hackathon questions, refer to:
- Backend README: `backend/README.md`
- Main README: `README.md`
- API Docs: http://localhost:8000/docs

