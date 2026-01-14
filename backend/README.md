# LMA Edge Platform - Backend API

Production-grade Loan Market Analytics platform backend with Covenant Breach Simulator.

## Features

- **Document Analysis**: Upload LMA PDFs and extract financial covenants using RAG pipeline
- **Covenant Breach Simulator**: Stress test loans with customizable scenarios (EBITDA drop, interest rate hikes)
- **Multi-tenancy**: Secure tenant isolation for different banks/lenders
- **Audit Trail**: Full transparency with source text and page numbers for every extraction
- **Export Reports**: Generate CSV/Excel compliance reports for credit committees

## Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment

Copy `.env.example` to `.env` and set your OpenAI API key:

```bash
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

### 3. Initialize Database

The database will be automatically initialized on first run. For SQLite (default), no additional setup needed. For PostgreSQL:

```bash
# Update DATABASE_URL in .env
DATABASE_URL=postgresql://user:password@localhost:5432/lma_db
```

### 4. Run the Server

```bash
# Development mode with auto-reload
uvicorn app.main:app --reload --port 8000

# Or use the Python module
python -m app.main
```

The API will be available at `http://localhost:8000`
- API Docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API Endpoints

### Document Analysis
- `POST /api/v1/analyze-document` - Upload and analyze LMA PDF
- `GET /api/v1/documents/{document_id}` - Get document details with audit trail

### Covenant Simulation
- `POST /api/v1/simulate-stress-test` - Run stress test simulation
- `GET /api/v1/simulate-stress-test/{test_id}` - Get simulation results
- `GET /api/v1/simulate-stress-test` - List recent simulations

### Export
- `GET /api/v1/export-compliance-report` - Export compliance report (CSV/Excel)
- `GET /api/v1/export-stress-test/{test_id}` - Export stress test results

### Loans & Covenants
- `GET /api/v1/loans` - List all loans
- `GET /api/v1/loans/{loan_id}` - Get loan details
- `PUT /api/v1/covenants/{covenant_id}/value` - Update covenant current value

## Architecture

### Database Schema
- **Tenants**: Multi-tenant isolation
- **Loans**: Loan master data
- **Covenants**: Financial covenant definitions and thresholds
- **Documents**: Uploaded LMA PDFs
- **DocumentExtractions**: AI extraction audit trail
- **CovenantAudits**: Covenant value change history
- **StressTestResults**: Simulation results

### RAG Pipeline
1. PDF text extraction with page numbers
2. Text chunking for vector storage
3. ChromaDB embedding storage
4. LLM-based covenant extraction with structured output
5. Audit trail with source text and page references

### Simulation Engine
- Calculates stressed ratios based on EBITDA drop and interest rate changes
- Categorizes loans as "Breach", "At Risk" (within 5%), or "Safe"
- Generates risk heatmap for portfolio analysis

## Multi-tenancy

All endpoints support `tenant_id` parameter. If not provided, uses `DEFAULT_TENANT_ID` from config. Data is isolated by tenant at the database level.

## Development

### Project Structure
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── config.py            # Configuration
│   ├── database.py           # Database connection
│   ├── models.py             # SQLAlchemy models
│   ├── routers/              # API endpoints
│   │   ├── documents.py
│   │   ├── simulation.py
│   │   ├── export.py
│   │   └── loans.py
│   └── services/             # Business logic
│       ├── rag_service.py
│       └── simulation_service.py
├── requirements.txt
├── .env.example
└── README.md
```

## Notes for Hackathon

- Uses SQLite by default for quick setup (can switch to PostgreSQL)
- OpenAI API key required for document analysis
- All extractions include audit trail (source text + page number)
- Simulation results are persisted for historical analysis
- Export formats support credit committee workflows

