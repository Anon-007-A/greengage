# GreenGauge API Documentation

**Version**: 1.0.0  
**Base URL**: `/api/v1`  
**Last Updated**: January 2025

---

## Table of Contents

1. [Authentication](#authentication)
2. [Rate Limiting](#rate-limiting)
3. [Loan Endpoints](#loan-endpoints)
4. [Covenant Endpoints](#covenant-endpoints)
5. [ESG Metrics](#esg-metrics)
6. [Portfolio Analytics](#portfolio-analytics)
7. [Stress Testing & Scenarios](#stress-testing--scenarios)
8. [Compliance & Reporting](#compliance--reporting)
9. [Data Import/Export](#data-importexport)
10. [Integration Examples](#integration-examples)

---

## Authentication

### Bearer Token (Demo)

All requests require a Bearer token in the Authorization header:

```http
Authorization: Bearer your-api-token-here
```

**Demo Token**: `demo-token-2025`

---

## Rate Limiting

- **Request Limit**: 1,000 requests per minute per API key
- **Response Headers**:
  - `X-RateLimit-Limit`: Total allowed requests
  - `X-RateLimit-Remaining`: Requests remaining in current window
  - `X-RateLimit-Reset`: Unix timestamp when limit resets

**Rate Limit Exceeded Response**:

```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 60
}
```

---

## Loan Endpoints

### GET /loans

**Description**: List loans with pagination and filtering.

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| skip | integer | 0 | Number of records to skip |
| limit | integer | 25 | Records per page (max: 100) |
| sector | string | null | Filter by sector (e.g., "Renewable Energy") |
| risk_level | string | null | Filter by risk ("low", "high", "critical") |
| covenant_status | string | null | Filter by covenant status ("compliant", "at_risk", "breached") |

**Request**:

```bash
GET /api/v1/loans?skip=0&limit=25&sector=Renewable%20Energy&risk_level=low
```

**Response** (200 OK):

```json
{
  "total": 47,
  "skip": 0,
  "limit": 25,
  "count": 25,
  "loans": [
    {
      "id": "loan-001",
      "companyName": "SolarGrid Energy GmbH",
      "sector": "Renewable Energy",
      "loanAmount": 50000000,
      "currency": "EUR",
      "originationDate": "2023-01-15",
      "maturityDate": "2028-01-15",
      "interestRate": 3.5,
      "status": "active",
      "relationshipManager": "Johan Schmidt",
      "lastReviewDate": "2024-12-15",
      "covenants": [...],
      "esgMetrics": [...],
      "riskScore": {
        "overall": 25,
        "covenantComponent": 20,
        "impactComponent": 32,
        "level": "low",
        "trend": "improving",
        "recommendations": [...]
      }
    }
    // ... more loans
  ]
}
```

---

### GET /loans/{loan_id}

**Description**: Get detailed information for a specific loan.

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| loan_id | string | Unique loan identifier (e.g., "loan-001") |

**Request**:

```bash
GET /api/v1/loans/loan-001
```

**Response** (200 OK):

```json
{
  "id": "loan-001",
  "companyName": "SolarGrid Energy GmbH",
  "sector": "Renewable Energy",
  "loanAmount": 50000000,
  "currency": "EUR",
  "originationDate": "2023-01-15",
  "maturityDate": "2028-01-15",
  "interestRate": 3.5,
  "status": "active",
  "relationshipManager": "Johan Schmidt",
  "lastReviewDate": "2024-12-15",
  "covenants": [
    {
      "name": "Debt-to-EBITDA",
      "type": "financial",
      "currentValue": 2.8,
      "threshold": 4.0,
      "unit": "x",
      "status": "compliant",
      "cushionPercent": 30,
      "daysToBreachEstimate": null,
      "trend": [3.2, 3.0, 2.8],
      "lastUpdated": "2024-12-20T10:30:00Z"
    }
  ],
  "esgMetrics": [...]
}
```

---

### GET /loans/search

**Description**: Full-text search loans by company name, sector, or ID.

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| q | string | Yes | Search query (min 1 character) |

**Request**:

```bash
GET /api/v1/loans/search?q=SolarGrid
```

**Response** (200 OK):

```json
{
  "query": "SolarGrid",
  "results": [
    {
      "id": "loan-001",
      "companyName": "SolarGrid Energy GmbH",
      "sector": "Renewable Energy",
      "loanAmount": 50000000
    }
  ],
  "count": 1
}
```

---

## Covenant Endpoints

### GET /loans/{loan_id}/covenants

**Description**: Get all covenants for a specific loan.

**Request**:

```bash
GET /api/v1/loans/loan-001/covenants
```

**Response** (200 OK):

```json
{
  "loanId": "loan-001",
  "companyName": "SolarGrid Energy GmbH",
  "covenantCount": 3,
  "covenants": [
    {
      "name": "Debt-to-EBITDA",
      "type": "financial",
      "currentValue": 2.8,
      "threshold": 4.0,
      "unit": "x",
      "status": "compliant",
      "cushionPercent": 30,
      "daysToBreachEstimate": null,
      "trend": [3.2, 3.0, 2.8],
      "lastUpdated": "2024-12-20T10:30:00Z"
    }
  ],
  "summary": {
    "compliant": 3,
    "at_risk": 0,
    "breached": 0
  }
}
```

---

### POST /loans/{loan_id}/covenants

**Description**: Submit updated covenant data (e.g., from quarterly reporting).

**Request Body**:

```json
{
  "covenantId": "cov-001-1",
  "currentValue": 3.1,
  "submissionDate": "2024-12-20",
  "source": "Q4 2024 Financial Statements"
}
```

**Request**:

```bash
POST /api/v1/loans/loan-001/covenants
Content-Type: application/json

{
  "covenantId": "cov-001-1",
  "currentValue": 3.1,
  "submissionDate": "2024-12-20",
  "source": "Q4 2024 Financial Statements"
}
```

**Response** (200 OK):

```json
{
  "success": true,
  "loan_id": "loan-001",
  "covenant_id": "cov-001-1",
  "old_value": 2.8,
  "new_value": 3.1,
  "new_status": "compliant",
  "cushion_percent": 22.5,
  "submission_date": "2024-12-20"
}
```

**Error Response** (404 Not Found):

```json
{
  "detail": "Covenant not found"
}
```

---

### POST /covenants/forecast

**Description**: Forecast covenant breach probability based on historical trend.

**Request Body**:

```json
{
  "loanId": "loan-001",
  "covenantId": "cov-001-1",
  "threshold": 4.0,
  "historicalValues": [2.8, 2.9, 3.1],
  "historicalDates": ["2024-10-20", "2024-11-20", "2024-12-20"]
}
```

**Response** (200 OK):

```json
{
  "loanId": "loan-001",
  "covenantId": "cov-001-1",
  "currentValue": 3.1,
  "threshold": 4.0,
  "trend": "deteriorating",
  "breachProbability": 42.3,
  "estimatedMonthsToBreach": 18,
  "confidence": 0.72,
  "recommendations": ["Monitor quarterly and discuss with borrower"]
}
```

---

## ESG Metrics

### GET /loans/{loan_id}/esg

**Description**: Get ESG metrics and progress for a loan.

**Request**:

```bash
GET /api/v1/loans/loan-001/esg
```

**Response** (200 OK):

```json
{
  "loanId": "loan-001",
  "companyName": "SolarGrid Energy GmbH",
  "sector": "Renewable Energy",
  "metricsCount": 3,
  "verifiedMetrics": 3,
  "overallProgress": 90.2,
  "metrics": [
    {
      "name": "CO2 Emissions Reduced",
      "category": "environmental",
      "currentValue": 45000,
      "targetValue": 50000,
      "unit": "tonnes/year",
      "progressPercent": 90,
      "verificationStatus": "verified",
      "submissionHistory": [
        {
          "month": "Oct 2024",
          "value": 42000,
          "verified": true
        },
        {
          "month": "Nov 2024",
          "value": 43500,
          "verified": true
        },
        {
          "month": "Dec 2024",
          "value": 45000,
          "verified": true
        }
      ],
      "lastUpdated": "2024-12-20T10:30:00Z"
    }
  ]
}
```

---

## Portfolio Analytics

### GET /portfolio/summary

**Description**: Get portfolio-level summary metrics.

**Request**:

```bash
GET /api/v1/portfolio/summary
```

**Response** (200 OK):

```json
{
  "totalAmount": 2250000000,
  "portfolioCount": 100,
  "bySector": {
    "Renewable Energy": 900000000,
    "Sustainable Transport": 550000000,
    "Circular Economy": 400000000,
    "Green Real Estate": 250000000,
    "Water Management": 90000000,
    "Agriculture & Food": 60000000
  },
  "riskDistribution": {
    "low": 60,
    "high": 30,
    "critical": 10
  },
  "averageRiskScore": 38.7,
  "lastUpdated": "2024-12-20T15:45:00Z"
}
```

---

### GET /portfolio/risk-score

**Description**: Get aggregate portfolio risk score and distribution.

**Request**:

```bash
GET /api/v1/portfolio/risk-score
```

**Response** (200 OK):

```json
{
  "portfolioRiskScore": 38.7,
  "riskDistribution": {
    "low": 60,
    "high": 30,
    "critical": 10
  },
  "riskByAmount": {
    "safe": 1350000000,
    "atRisk": 675000000,
    "breached": 225000000
  },
  "breachMetrics": {
    "currentBreach": 10,
    "atRiskLoans": 30,
    "estimatedNextBreach": 67
  },
  "recommendations": [
    "Review 30 loans in 'at risk' category",
    "Total at-risk exposure: €675.0M",
    "Prioritize covenant waivers for top 3 exposure loans",
    "Schedule management discussions with 2+ covenant breaches"
  ],
  "lastCalculated": "2024-12-20T15:45:00Z"
}
```

---

## Stress Testing & Scenarios

### GET /api/scenarios/{scenario_id}

**Description**: Get results for a stress test scenario.

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| scenario_id | string | Scenario identifier: "baseline", "rate_plus_2", "ebitda_minus_10", "esg_miss", "combined" |

**Available Scenarios**:

- `baseline` - No stress (baseline)
- `rate_plus_2` - Interest rate +2%
- `ebitda_minus_10` - EBITDA -10%
- `esg_miss` - ESG targets missed
- `combined` - Combined stress test

**Request**:

```bash
GET /api/v1/api/scenarios/rate_plus_2
```

**Response** (200 OK):

```json
{
  "scenarioId": "rate_plus_2",
  "scenarioName": "Interest Rate +2%",
  "loansAnalyzed": 20,
  "totalNewBreaches": 5,
  "affectedLoans": 4,
  "results": [
    {
      "loanId": "loan-001",
      "companyName": "SolarGrid Energy GmbH",
      "baselineBreaches": 0,
      "stressBreaches": 0,
      "newBreaches": 0,
      "impactPercent": 0.0
    },
    {
      "loanId": "loan-002",
      "companyName": "GreenBuild Construction",
      "baselineBreaches": 1,
      "stressBreaches": 2,
      "newBreaches": 1,
      "impactPercent": 33.3
    }
  ],
  "summary": {
    "worstCaseBreaches": 3,
    "averageImpact": 5.2
  }
}
```

---

## Compliance & Reporting

### GET /compliance/csrd-report

**Description**: Generate CSRD (Corporate Sustainability Reporting Directive) compliance report.

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| period | string | "Q4-2024" | Reporting period |
| format | string | "json" | Output format: "json" or "pdf" |

**Request**:

```bash
GET /api/v1/compliance/csrd-report?period=Q4-2024&format=json
```

**Response** (200 OK):

```json
{
  "reportPeriod": "Q4-2024",
  "portfolioSize": 100,
  "totalExposure": 2250000000,
  "esgAggregates": {
    "environmental": {
      "metricsCount": 150,
      "verifiedCount": 135,
      "averageProgress": 84.3
    },
    "social": {
      "metricsCount": 120,
      "verifiedCount": 102,
      "averageProgress": 78.5
    },
    "governance": {
      "metricsCount": 90,
      "verifiedCount": 81,
      "averageProgress": 76.2
    }
  },
  "complianceStatus": {
    "euTaxonomyAligned": 75,
    "tcfdDisclosed": 68,
    "sfdrLevel3": 45
  },
  "recommendations": [
    "Increase verified ESG submissions to 95% by Q2 2025",
    "Implement EU Taxonomy mapping for all loans",
    "Add TCFD climate risk disclosures"
  ],
  "generatedAt": "2024-12-20T16:00:00Z"
}
```

---

## Data Import/Export

### POST /data-import

**Description**: Import loan data from external sources (CSV, JSON, Bloomberg, etc.).

**Request Body**:

```json
{
  "source": "bloomberg",
  "fileFormat": "json",
  "dataPoints": [
    {
      "loanId": "LOAN-NEW-001",
      "companyName": "New Green Corp",
      "loanAmount": 75000000,
      "sector": "Renewable Energy"
    }
  ]
}
```

**Request**:

```bash
POST /api/v1/data-import
Content-Type: application/json

{
  "source": "bloomberg",
  "fileFormat": "json",
  "dataPoints": [...]
}
```

**Response** (200 OK):

```json
{
  "status": "success",
  "message": "Data import from bloomberg (json) initiated",
  "recordsProcessed": 1,
  "validationErrors": 0,
  "importId": "import-1703084400.1234",
  "timestamp": "2024-12-20T16:00:00.123456Z"
}
```

---

## Integration Examples

### Bloomberg Data Integration

**How GreenGauge maps Bloomberg data**:

```python
# Bloomberg data format
bloomberg_data = {
    "ISIN": "DE0008017002",
    "TICKER": "EDF",
    "CUR_MKT_CAP": 75000000000,  # Currency
    "LAST_PRICE": 12.50,
    "FIELD_SRC": "FUND"
}

# GreenGauge normalized format
greengauge_format = {
    "id": "loan-bloomberg-EDF",
    "companyName": "EDF Énergies Nouvelles",
    "sector": "Renewable Energy",
    "loanAmount": 50000000,  # Extracted from market cap estimate
    "currency": "EUR"
}
```

---

### LSEG/Refinitiv Integration

**LMA Covenant Taxonomy Mapping**:

```json
{
  "lseDataFormat": {
    "COVENANT_TYPE": "Financial Covenants",
    "METRIC": "Total Debt to EBITDA",
    "THRESHOLD": 4.0
  },
  "greengaugeMapping": {
    "covenant": {
      "name": "Debt-to-EBITDA",
      "type": "financial",
      "threshold": 4.0,
      "lmaStandardId": "FC-001-DEBT-EBITDA"
    }
  }
}
```

---

### SWIFT Standards Alignment

**Loan Syndication Message (MT300) Mapping**:

```
GreenGauge API ←→ SWIFT MT300 (Loan Syndication Message)
├─ loanAmount    → Field 32A (Amount)
├─ currency      → Field 32A (Currency)
├─ maturityDate  → Field 30F (Maturity Date)
├─ interestRate  → Field 37G (Interest Rate)
└─ covenants     → Field 40E (Conditions)
```

---

### EU Taxonomy Alignment

**Data Format for EU Taxonomy Reporting**:

```json
{
  "taxonomyEligibility": {
    "climateChange": {
      "mitigation": true,
      "adaptation": false,
      "dnsh": "Do Not Significantly Harm"
    },
    "activities": [
      {
        "code": "3.1",
        "description": "Renewable energy production",
        "eligible": true,
        "aligned": true
      }
    ]
  }
}
```

---

## Error Handling

### Standard Error Response Format

```json
{
  "detail": "Error message describing what went wrong",
  "error_code": "RESOURCE_NOT_FOUND",
  "timestamp": "2024-12-20T16:00:00Z"
}
```

### Common HTTP Status Codes

| Status | Description                          |
| ------ | ------------------------------------ |
| 200    | Request successful                   |
| 400    | Bad request (validation error)       |
| 401    | Unauthorized (missing/invalid token) |
| 404    | Resource not found                   |
| 429    | Rate limit exceeded                  |
| 500    | Server error                         |

---

## Data Schemas

### Loan Schema

```json
{
  "id": "string (uuid)",
  "companyName": "string",
  "sector": "string",
  "loanAmount": "number (currency in EUR)",
  "currency": "string (ISO 4217)",
  "originationDate": "date (YYYY-MM-DD)",
  "maturityDate": "date (YYYY-MM-DD)",
  "interestRate": "number (percentage)",
  "status": "enum (active, inactive, defaulted)",
  "relationshipManager": "string",
  "lastReviewDate": "date"
}
```

### Covenant Schema

```json
{
  "name": "string",
  "type": "enum (financial, operational, esg)",
  "currentValue": "number",
  "threshold": "number",
  "unit": "string",
  "status": "enum (compliant, at_risk, breached)",
  "cushionPercent": "number",
  "daysToBreachEstimate": "integer|null",
  "trend": "array of numbers (historical values)",
  "lastUpdated": "datetime"
}
```

### ESG Metric Schema

```json
{
  "name": "string",
  "category": "enum (environmental, social, governance)",
  "currentValue": "number",
  "targetValue": "number",
  "unit": "string",
  "progressPercent": "number (0-100)",
  "verificationStatus": "enum (verified, pending, under_review)",
  "submissionHistory": "array of {month, value, verified}",
  "lastUpdated": "datetime"
}
```

---

## Versioning

Current API Version: **v1**  
Endpoint Prefix: `/api/v1/`

Future versions will be released with backward compatibility considerations.

---

## Support & Feedback

- **Documentation**: [GreenGauge Docs](https://docs.greengauge.io)
- **Status Page**: [Status](https://status.greengauge.io)
- **Support Email**: api-support@greengauge.io

---

**Last Updated**: January 2025  
**Next Update**: Scheduled for Q1 2025
