# GreenGauge API Documentation

## Overview

GreenGauge provides a comprehensive REST API for loan portfolio management, breach prediction, stress testing, ESG analytics, and compliance reporting.

**Base URL**: `https://api.greengauge.com/v1`

**Authentication**: JWT Bearer tokens

## Authentication

All API requests require authentication via JWT Bearer tokens.

```http
Authorization: Bearer <your_jwt_token>
```

## Rate Limits

- **Free Tier**: 100 requests/hour
- **Professional Tier**: 1,000 requests/hour
- **Enterprise Tier**: 10,000 requests/hour

Rate limit headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1640995200
```

## Endpoints

### Loan Management

#### Get Loans
```http
GET /api/loans
```

**Query Parameters:**
- `page` (int, default: 1): Page number
- `limit` (int, default: 50, max: 1000): Items per page
- `sector` (string): Filter by sector
- `risk_level` (string): Filter by risk level (low, medium, high, critical)
- `esg_score_min` (int): Minimum ESG score (0-100)
- `status` (string): Filter by status (active, watchlist, default)

**Response:**
```json
{
  "loans": [
    {
      "id": "loan-001",
      "companyName": "SolarGrid Energy",
      "sector": "Renewable Energy",
      "loanAmount": 50000000,
      "currency": "EUR",
      "status": "active",
      "riskScore": {
        "overall": 25,
        "level": "low"
      },
      "esgMetrics": [...]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1000,
    "totalPages": 20
  }
}
```

#### Get Loan by ID
```http
GET /api/loans/{id}
```

**Response:**
```json
{
  "id": "loan-001",
  "companyName": "SolarGrid Energy",
  "sector": "Renewable Energy",
  "loanAmount": 50000000,
  "currency": "EUR",
  "originationDate": "2023-01-15",
  "maturityDate": "2028-01-15",
  "interestRate": 3.5,
  "status": "active",
  "relationshipManager": "Johan Schmidt",
  "covenants": [...],
  "esgMetrics": [...],
  "riskScore": {...}
}
```

### Breach Prediction

#### Get Breach Prediction
```http
GET /api/loans/{id}/breach-prediction
```

**Query Parameters:**
- `ebitda_drop` (float, optional): EBITDA drop percentage
- `rate_hike` (int, optional): Interest rate hike in bps

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
    },
    {
      "factor": "Interest coverage below 5x",
      "impact": 15.0
    }
  ],
  "recommendations": [
    "Request waiver from syndicate agents",
    "Initiate covenant reset negotiation"
  ]
}
```

### Stress Testing

#### Run Stress Test
```http
POST /api/simulator/run
```

**Request Body:**
```json
{
  "ebitda_drop_percent": 15,
  "interest_rate_hike_bps": 150,
  "loan_ids": ["loan-001", "loan-002"]
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
    "loans": [
      {
        "loan_id": "loan-001",
        "company_name": "SolarGrid Energy",
        "overall_status": "safe",
        "breach_count": 0,
        "at_risk_count": 0,
        "covenants": [...]
      }
    ]
  }
}
```

#### Get Scenarios
```http
GET /api/simulator/scenarios
```

**Response:**
```json
{
  "scenarios": [
    {
      "id": "scenario-001",
      "name": "Mild Downturn",
      "ebitda_drop_percent": 5,
      "interest_rate_hike_bps": 50,
      "created_at": "2024-12-20T10:00:00Z"
    }
  ]
}
```

### ESG Analytics

#### Get Portfolio ESG Analysis
```http
GET /api/esg/portfolio-analysis
```

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

#### Get Loan ESG Metrics
```http
GET /api/esg/loans/{id}/metrics
```

**Response:**
```json
{
  "loan_id": "loan-001",
  "greenScore": 85,
  "esgCategory": "Dark Green",
  "metrics": [
    {
      "name": "CO2 Emissions Reduced",
      "currentValue": 5000,
      "targetValue": 6000,
      "unit": "tonnes/year",
      "progressPercent": 83
    }
  ]
}
```

### Reports

#### Generate Report
```http
POST /api/reports/generate
```

**Request Body:**
```json
{
  "report_type": "CSRD",
  "scenario_id": "scenario-123",
  "format": "pdf"
}
```

**Response:**
- **PDF**: Binary file download
- **JSON/CSV**: JSON response with data

#### Get Report
```http
GET /api/reports/{id}
```

**Response:**
```json
{
  "id": "report-123",
  "report_type": "CSRD",
  "status": "completed",
  "download_url": "https://api.greengauge.com/reports/report-123.pdf",
  "generated_at": "2024-12-20T10:00:00Z"
}
```

### Compliance

#### Get Compliance Status
```http
GET /api/compliance/status
```

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

## Error Handling

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

### Common Error Codes

- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Webhooks

GreenGauge supports webhooks for real-time updates:

- `loan.breach_detected`: Triggered when a breach is detected
- `loan.at_risk`: Triggered when a loan moves to at-risk status
- `report.generated`: Triggered when a report is generated

## SDKs

Official SDKs available for:
- **JavaScript/TypeScript**: `@greengauge/sdk`
- **Python**: `greengauge-python`
- **R**: `greengauge-r` (coming soon)

## Support

For API support, contact:
- **Email**: api@greengauge.com
- **Documentation**: https://docs.greengauge.com
- **Status Page**: https://status.greengauge.com

