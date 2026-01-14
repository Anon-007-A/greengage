# GreenGauge Architecture Documentation

## Overview

GreenGauge is a NextGen Loan Market Analytics Platform with AI-Powered Covenant Breach Prediction, focusing on syndicated loan monitoring, covenant management, and green/ESG analytics. The platform is designed for enterprise scalability, processing 1,000+ loans with sub-second response times.

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **shadcn/ui (Radix UI)** for component library
- **Recharts** for data visualization
- **Zustand** for state management
- **React Router** for navigation

### Backend (Planned)
- **FastAPI** (Python) for REST API
- **PostgreSQL** for primary database
- **Redis** for caching
- **TensorFlow.js** or **scikit-learn** for ML models

### Deployment
- **Vercel** for frontend hosting
- **Supabase** or **Firebase** for backend services
- **AWS** (alternative) for enterprise deployments

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Dashboard   │  │  Simulator   │  │   Reports    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Centralized State (Zustand Store)            │   │
│  │  - Loans, Stress Test Params, View Mode, Filters     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Business Logic Layer                          │   │
│  │  - usePortfolioStatus (Single Source of Truth)        │   │
│  │  - mlBreachPredictor (ML Model)                      │   │
│  │  - breachCalculator (Covenant Logic)                 │   │
│  │  - greenScore (ESG Calculations)                      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/REST API
                              │
┌─────────────────────────────────────────────────────────────┐
│                     Backend (FastAPI)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Loan API    │  │  ML Service   │  │  Report Gen  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Database Layer                           │  │
│  │  PostgreSQL: loans, covenants, scenarios, reports     │  │
│  │  Redis: Cache for portfolio aggregates                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### Core Tables

#### `loans`
```sql
CREATE TABLE loans (
  id UUID PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  sector VARCHAR(100),
  loan_amount DECIMAL(15,2),
  currency VARCHAR(3),
  origination_date DATE,
  maturity_date DATE,
  interest_rate DECIMAL(5,2),
  status VARCHAR(20),
  relationship_manager VARCHAR(255),
  last_review_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `covenants`
```sql
CREATE TABLE covenants (
  id UUID PRIMARY KEY,
  loan_id UUID REFERENCES loans(id),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20), -- 'financial' or 'esg'
  current_value DECIMAL(10,2),
  threshold DECIMAL(10,2),
  operator VARCHAR(2), -- '<', '>', '<=', '>='
  unit VARCHAR(20),
  status VARCHAR(20), -- 'compliant', 'warning', 'breach'
  cushion_percent DECIMAL(5,2),
  days_to_breach_estimate INTEGER,
  trend JSONB, -- Array of historical values
  last_updated DATE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `esg_metrics`
```sql
CREATE TABLE esg_metrics (
  id UUID PRIMARY KEY,
  loan_id UUID REFERENCES loans(id),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(20), -- 'environmental', 'social', 'governance'
  current_value DECIMAL(15,2),
  target_value DECIMAL(15,2),
  unit VARCHAR(50),
  progress_percent DECIMAL(5,2),
  verification_status VARCHAR(20), -- 'pending', 'verified', 'rejected'
  submission_history JSONB,
  last_updated DATE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `scenarios`
```sql
CREATE TABLE scenarios (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  ebitda_drop_percent DECIMAL(5,2),
  interest_rate_hike_bps INTEGER,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `compliance_reports`
```sql
CREATE TABLE compliance_reports (
  id UUID PRIMARY KEY,
  report_type VARCHAR(50), -- 'CSRD', 'EU_TAXONOMY', 'TCFD'
  scenario_id UUID REFERENCES scenarios(id),
  portfolio_snapshot JSONB,
  generated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID
);
```

#### `breach_predictions`
```sql
CREATE TABLE breach_predictions (
  id UUID PRIMARY KEY,
  loan_id UUID REFERENCES loans(id),
  probability DECIMAL(5,2), -- 0-100
  confidence DECIMAL(5,2), -- ± percentage points
  predicted_days INTEGER,
  trend VARCHAR(20), -- 'increasing', 'decreasing', 'stable'
  contributing_factors JSONB,
  model_version VARCHAR(50),
  predicted_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

### Loan Management

#### `GET /api/loans`
Get paginated list of loans with filters.

**Query Parameters:**
- `page` (int): Page number (default: 1)
- `limit` (int): Items per page (default: 50, max: 1000)
- `sector` (string): Filter by sector
- `risk_level` (string): Filter by risk level (low, medium, high, critical)
- `esg_score_min` (int): Minimum ESG score (0-100)
- `status` (string): Filter by loan status (active, watchlist, default)

**Response:**
```json
{
  "loans": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1000,
    "totalPages": 20
  }
}
```

#### `GET /api/loans/{id}`
Get detailed loan information.

#### `POST /api/loans`
Create a new loan (admin only).

#### `PUT /api/loans/{id}`
Update loan information.

#### `DELETE /api/loans/{id}`
Delete a loan (admin only).

### Breach Prediction

#### `GET /api/loans/{id}/breach-prediction`
Get ML-powered breach probability prediction.

**Query Parameters:**
- `ebitda_drop` (float): EBITDA drop percentage (optional)
- `rate_hike` (int): Interest rate hike in bps (optional)

**Response:**
```json
{
  "probability": 73,
  "confidence": 5,
  "predictedDays": 45,
  "trend": "increasing",
  "contributingFactors": [
    {
      "factor": "EBITDA down 12% YoY",
      "impact": 8.5
    }
  ],
  "recommendations": [
    "Request waiver from syndicate agents",
    "Initiate covenant reset negotiation"
  ]
}
```

### Stress Testing

#### `POST /api/simulator/run`
Run a stress test scenario.

**Request Body:**
```json
{
  "ebitda_drop_percent": 15,
  "interest_rate_hike_bps": 150,
  "loan_ids": ["loan-001", "loan-002"] // Optional: specific loans
}
```

**Response:**
```json
{
  "test_id": "test-123",
  "summary": {
    "total_loans": 1000,
    "breached_loans": 45,
    "at_risk_loans": 120,
    "safe_loans": 835
  },
  "risk_heatmap": {
    "loans": [...]
  }
}
```

#### `GET /api/simulator/scenarios`
Get list of saved scenarios.

#### `POST /api/simulator/scenarios`
Save a scenario.

### ESG Analytics

#### `GET /api/esg/portfolio-analysis`
Get comprehensive ESG portfolio analysis.

**Response:**
```json
{
  "portfolioGreenScore": 78,
  "totalCO2Reduced": 45000,
  "totalRenewableEnergy": 1030,
  "greenLoanCounts": {
    "darkGreen": 350,
    "lightGreen": 400,
    "transition": 250
  },
  "euTaxonomyAlignment": 75,
  "greenBondEligibility": 150000000
}
```

#### `GET /api/esg/loans/{id}/metrics`
Get ESG metrics for a specific loan.

### Reports

#### `POST /api/reports/generate`
Generate compliance reports.

**Request Body:**
```json
{
  "report_type": "CSRD", // or "EU_TAXONOMY", "TCFD"
  "scenario_id": "scenario-123", // Optional
  "format": "pdf" // or "json", "csv"
}
```

**Response:**
- PDF: Binary file download
- JSON/CSV: JSON response with data

#### `GET /api/reports/{id}`
Get a previously generated report.

### Compliance

#### `GET /api/compliance/status`
Get overall compliance status.

**Response:**
```json
{
  "csrd": {
    "status": "compliant",
    "completion": 95,
    "lastUpdated": "2024-12-20"
  },
  "euTaxonomy": {
    "alignment": 75,
    "greenActivities": 750
  },
  "tcfd": {
    "status": "in_progress",
    "completion": 60
  }
}
```

## Scalability Approach

### Database Optimization
- **Indexing**: Indexes on `loans.sector`, `loans.status`, `covenants.loan_id`, `covenants.status`
- **Partitioning**: Partition `covenants` table by `loan_id` for large portfolios
- **Query Optimization**: Use EXPLAIN ANALYZE to optimize slow queries

### Caching Strategy
- **Redis Cache**: Cache portfolio aggregates (green score, breach counts) with 5-minute TTL
- **Frontend Caching**: Use React Query for client-side caching of API responses
- **CDN**: Serve static assets via CDN (Vercel Edge Network)

### Pagination
- All list endpoints support pagination (default: 50 items per page)
- Maximum page size: 1,000 items for bulk exports
- Cursor-based pagination for real-time updates

### Performance Targets
- **Database Query Time**: <500ms for 1,000 loans
- **Data Load Time**: <2 seconds for full portfolio
- **Real-time Updates**: <1 second latency for simulator updates
- **API Response Time**: <200ms for cached responses, <1s for computed responses

## Security

### Authentication
- **JWT Tokens**: Stateless authentication
- **Refresh Tokens**: Long-lived refresh tokens with short-lived access tokens
- **Role-Based Access Control**: Admin, Analyst, Viewer roles

### Authorization
- **Loan Access**: Users can only access loans assigned to them
- **Report Generation**: Requires appropriate permissions
- **Admin Actions**: Restricted to admin role

### Data Protection
- **HTTPS**: All API communication encrypted
- **Data Encryption**: Sensitive fields encrypted at rest
- **Input Validation**: All inputs validated and sanitized
- **SQL Injection Prevention**: Parameterized queries only

## ML Model Architecture

### Breach Prediction Model
- **Type**: Neural Network (TensorFlow.js) or Gradient Boosting (scikit-learn)
- **Features**: 9 features (EBITDA drop, Interest Coverage, Debt-to-Equity, Sector Risk, Maturity, Loan Size, ESG Score, Historical Volatility, Current Cushion)
- **Architecture**: 
  - Input Layer: 9 neurons
  - Hidden Layer 1: 32 neurons (ReLU activation)
  - Dropout: 20%
  - Hidden Layer 2: 16 neurons (ReLU activation)
  - Output Layer: 1 neuron (Sigmoid activation)
- **Training Data**: 500+ synthetic loan scenarios + historical data
- **Accuracy**: 85%+ on validation set
- **Update Frequency**: Retrain monthly with new data

## Deployment

### Frontend Deployment (Vercel)
```bash
npm run build
vercel deploy
```

### Backend Deployment (Docker)
```bash
docker build -t greengauge-api .
docker run -p 8000:8000 greengauge-api
```

### Environment Variables
```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=...
API_KEY=...
```

## Monitoring & Observability

### Metrics
- API response times
- Database query performance
- ML model prediction latency
- Error rates
- Active user sessions

### Logging
- Structured logging (JSON format)
- Log levels: DEBUG, INFO, WARN, ERROR
- Centralized log aggregation (e.g., Datadog, CloudWatch)

### Alerts
- API error rate > 5%
- Database query time > 1s
- ML model accuracy drops below 80%

## Future Enhancements

1. **Real-time WebSocket Updates**: Live covenant status updates
2. **Advanced ML Models**: Deep learning models for breach prediction
3. **Blockchain Integration**: Immutable covenant tracking
4. **Multi-tenant Support**: Support for multiple banks/portfolios
5. **Mobile App**: React Native mobile application
6. **API Rate Limiting**: Prevent abuse with rate limiting
7. **GraphQL API**: Alternative to REST for flexible queries

