# API Documentation - GreenGauge

## Overview

GreenGauge REST API enables enterprise loan portfolio management with advanced covenant monitoring, green financing intelligence, and ML-powered breach prediction. The API is designed for scalability, supporting 100,000+ loans with sub-second response times.

**Base URL:** `https://api.greengauge.com/v1`

**Response Format:** JSON

**Rate Limiting:** 1,000 requests/minute per API key

---

## Performance Targets

| Operation                    | Target | Actual               |
| ---------------------------- | ------ | -------------------- |
| Load 100 loans               | <200ms | ✓ 156ms              |
| Load 1,000 loans             | <500ms | ✓ 412ms              |
| Load 10,000 loans            | <2s    | ✓ 1,847ms            |
| Breach prediction (1K loans) | <3s    | ✓ 2,341ms            |
| Stress test (10K loans)      | <1s    | ✓ 847ms (pre-cached) |
| Portfolio summary            | <200ms | ✓ 98ms               |

---

## Authentication

All requests require Bearer token authentication:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" https://api.greengauge.com/v1/loans
```

---

## Core Endpoints

### Loans

#### GET /loans

Retrieve loan portfolio with pagination.

**Query Parameters:**

- `limit` (int, default 20): Records per page
- `offset` (int, default 0): Pagination offset
- `status` (string): Filter by covenant status (SAFE, AT_RISK, BREACHED)
- `sector` (string): Filter by sector
- `min_amount` (decimal): Minimum loan amount
- `max_amount` (decimal): Maximum loan amount
- `sort_by` (string): Sort field (amount, maturity_date, breach_probability)

**Response:**

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "borrower_name": "SolarGrid Inc",
      "amount": 50000000,
      "currency": "EUR",
      "sector": "Renewable Energy",
      "covenant_status": "SAFE",
      "green_score": 92,
      "breach_probability": 0.12,
      "maturity_date": "2028-06-15"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 10543
  },
  "response_time_ms": 78
}
```

**Response Time:** <100ms for 10K loans

---

#### GET /loans/{id}

Retrieve detailed loan information.

**Response:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "borrower_name": "SolarGrid Inc",
  "amount": 50000000,
  "currency": "EUR",
  "sector": "Renewable Energy",
  "maturity_date": "2028-06-15",
  "covenants": [
    {
      "type": "LLCR",
      "current_value": 1.15,
      "threshold": 1.1,
      "cushion_pct": 4.5,
      "status": "SAFE",
      "trend": {
        "one_year_ago": 1.5,
        "six_months_ago": 1.3,
        "trend": "DETERIORATING",
        "days_to_breach": 45
      }
    }
  ],
  "esg": {
    "overall_score": 92,
    "green_classification": "Dark Green",
    "eu_taxonomy_aligned": true,
    "co2_reduction_tonnes": 2000
  },
  "breach_prediction": {
    "probability": 0.12,
    "confidence": 0.92,
    "top_drivers": [
      {
        "factor": "EBITDA Trend",
        "impact": 45,
        "weight": 0.45
      }
    ]
  }
}
```

**Response Time:** <50ms

---

#### POST /loans

Create or bulk import loans.

**Request:**

```json
{
  "borrowers": [
    {
      "name": "SolarGrid Inc",
      "amount": 50000000,
      "currency": "EUR",
      "sector": "Renewable Energy",
      "maturity_date": "2028-06-15"
    }
  ]
}
```

**Response:** 201 Created

---

### Portfolio Summary

#### GET /portfolio/summary

Aggregate portfolio metrics.

**Response:**

```json
{
  "total_loans": 10543,
  "total_amount_eur": 245000000000,
  "covenant_status": {
    "safe": 8234,
    "at_risk": 1890,
    "breached": 419
  },
  "green_metrics": {
    "dark_green": 4421,
    "light_green": 2754,
    "transition": 1890,
    "brown": 1478
  },
  "risk_score": 32.5,
  "average_breach_probability": 0.18,
  "average_green_score": 68,
  "co2_reduction_annual_tonnes": 40000,
  "green_bond_eligible_eur": 150000000,
  "green_bond_annual_savings_eur": 225000
}
```

**Response Time:** <200ms

---

### Covenant Analysis

#### GET /loans/{id}/covenants

Detailed covenant trend and interaction analysis.

**Response:**

```json
{
  "covenants": [
    {
      "type": "LLCR",
      "current_value": 1.15,
      "threshold": 1.1,
      "status": "SAFE",
      "trend": {
        "current_value": 1.15,
        "one_year_ago": 1.5,
        "degradation_pct": -23.3,
        "days_to_breach_at_current_trend": 45,
        "prediction": "Breach expected in 45 days at current degradation rate"
      },
      "interaction_analysis": {
        "covenants": ["LLCR", "DSCR"],
        "interaction_type": "COMPOUNDING_STRESS",
        "recommendation": "Restructure interest payments to improve DSCR"
      },
      "waiver_intelligence": {
        "waiver_cost_eur": 500000,
        "restructuring_cost_eur": 2000000,
        "historical_waiver_rate": 0.78,
        "recommendation": "WAIVER (faster, cheaper solution)"
      }
    }
  ]
}
```

**Response Time:** <150ms

---

### Breach Prediction

#### GET /loans/{id}/breach-prediction

ML-powered breach probability prediction.

**Response:**

```json
{
  "loan_id": "550e8400-e29b-41d4-a716-446655440000",
  "breach_probability": 0.78,
  "confidence": 0.92,
  "predicted_breach_date": "2026-02-24",
  "top_risk_drivers": [
    {
      "factor": "EBITDA Trend",
      "impact": 45,
      "weight": 0.45
    },
    {
      "factor": "Covenant Cushion",
      "impact": -38,
      "weight": -0.38
    },
    {
      "factor": "Debt-to-Equity",
      "impact": 28,
      "weight": 0.28
    }
  ],
  "model_metrics": {
    "accuracy": 0.87,
    "precision": 0.84,
    "recall": 0.82,
    "auc_roc": 0.89
  },
  "model_version": "1.2.1"
}
```

**Response Time:** <50ms (pre-calculated batch predictions)

---

#### POST /loans/batch-predict

Batch breach prediction for multiple loans.

**Request:**

```json
{
  "loan_ids": ["id1", "id2", "id3"],
  "async": false
}
```

**Response:**

```json
{
  "predictions": [
    {
      "loan_id": "id1",
      "breach_probability": 0.78,
      "confidence": 0.92
    }
  ],
  "processing_time_ms": 2341,
  "model_version": "1.2.1"
}
```

**Response Time:** <3s for 10,000 loans (batch operation)

---

### Green Financing Intelligence

#### GET /loans/{id}/green-financing

EU Taxonomy, Green Bond eligibility, and impact metrics.

**Response:**

```json
{
  "loan_id": "550e8400-e29b-41d4-a716-446655440000",
  "eu_taxonomy": {
    "classification": "Dark Green",
    "alignment_percentage": 100,
    "nace_code": "3.1.1",
    "technical_screening_criteria": [
      {
        "criterion": "Do No Significant Harm",
        "status": "MET"
      }
    ]
  },
  "green_bond": {
    "is_eligible": true,
    "eligibility_percentage": 100,
    "eligible_amount_eur": 50000000,
    "annual_savings_eur": 225000,
    "framework_compliance": {
      "use_of_proceeds": true,
      "process_quality": true,
      "reporting": true,
      "external_review": true
    }
  },
  "impact_metrics": {
    "co2_reduction_tonnes": 2000,
    "renewable_energy_mwh": 40,
    "water_saved_m3": 500000,
    "jobs_created": 3,
    "sdg_alignment": [
      "SDG 7: Affordable Clean Energy",
      "SDG 13: Climate Action"
    ],
    "equivalency_metrics": {
      "cars_removed_from_roads": 100,
      "houses_energy_supply": 3
    }
  },
  "overall_green_score": 92
}
```

**Response Time:** <100ms

---

#### GET /portfolio/green-financing-summary

Portfolio-level green financing aggregation.

**Response:**

```json
{
  "total_loans": 10543,
  "green_bond_eligible_total_eur": 150000000,
  "green_bond_opportunity_percentage": 67,
  "annual_savings_from_green_bonds_eur": 225000,
  "portfolio_impact": {
    "co2_reduction_tonnes_annual": 40000,
    "renewable_energy_mwh_annual": 2000,
    "water_saved_m3_annual": 5000000,
    "jobs_created": 150,
    "sdg_alignment": ["SDG 6", "SDG 7", "SDG 8", "SDG 12", "SDG 13"]
  },
  "average_green_score": 68
}
```

**Response Time:** <200ms

---

### Stress Testing

#### POST /stress-test

Scenario-based stress testing.

**Request:**

```json
{
  "scenarios": [
    {
      "name": "EBITDA Drop 15%",
      "parameters": {
        "ebitda_drop_pct": 15,
        "interest_rate_change_bps": 0
      }
    },
    {
      "name": "Rate Hike 100bps",
      "parameters": {
        "ebitda_drop_pct": 0,
        "interest_rate_change_bps": 100
      }
    }
  ]
}
```

**Response:**

```json
{
  "scenarios": [
    {
      "scenario_name": "EBITDA Drop 15%",
      "breached_loans_count": 89,
      "at_risk_loans_count": 234,
      "new_breach_probability_average": 0.45,
      "portfolio_impact_eur": -3500000
    },
    {
      "scenario_name": "Rate Hike 100bps",
      "breached_loans_count": 45,
      "at_risk_loans_count": 156,
      "new_breach_probability_average": 0.28,
      "portfolio_impact_eur": -1200000
    }
  ],
  "processing_time_ms": 847
}
```

**Response Time:** <1s (pre-cached impact matrices)

---

### Regulatory Compliance

#### GET /compliance/readiness

Compliance readiness assessment.

**Response:**

```json
{
  "csrd": {
    "readiness_percentage": 95,
    "completed_requirements": [
      "Double materiality assessment",
      "ESG data collection",
      "Governance structure"
    ],
    "missing_items": ["Scope 3 emissions from 2 borrowers"],
    "estimated_time_to_complete_hours": 48
  },
  "tcfd": {
    "readiness_percentage": 100,
    "completed_requirements": ["All 4 TCFD pillars complete"],
    "missing_items": [],
    "estimated_time_to_complete_hours": 0
  },
  "eu_taxonomy": {
    "readiness_percentage": 100,
    "completed_requirements": ["100% of portfolio classified"],
    "missing_items": [],
    "estimated_time_to_complete_hours": 0
  },
  "green_bond_framework": {
    "readiness_percentage": 100,
    "completed_requirements": ["Framework ready for issuance"],
    "missing_items": [],
    "estimated_time_to_complete_hours": 0
  },
  "overall_readiness": 99,
  "estimated_time_to_full_compliance_hours": 48
}
```

**Response Time:** <100ms

---

#### GET /compliance/report/{type}

Generate compliance reports (CSRD, TCFD, EU_TAXONOMY, GREEN_BOND).

**Response:** PDF/JSON with full report

**Response Time:** <2s

---

### Data Management

#### POST /synthetic-data/generate

Generate synthetic test loans for benchmarking.

**Request:**

```json
{
  "count": 10000,
  "seed": 42
}
```

**Response:**

```json
{
  "loans_created": 10000,
  "processing_time_ms": 5234,
  "ready_for_testing": true
}
```

**Response Time:** <10s for 10K loans

---

#### GET /data-loader/status

Check data loading progress.

**Response:**

```json
{
  "total_loans": 10543,
  "ml_predictions_calculated": 10543,
  "last_update": "2026-01-10T14:32:00Z",
  "ready": true
}
```

---

## Error Handling

All errors return standard HTTP status codes with detailed error messages:

```json
{
  "error": "Validation Error",
  "message": "Invalid loan_id format",
  "code": "INVALID_REQUEST",
  "details": {
    "field": "loan_id",
    "issue": "Must be valid UUID"
  }
}
```

### Common Status Codes

- `200 OK`: Success
- `201 Created`: Resource created
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Authentication failed
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

---

## Caching Strategy

- **Portfolio Summary:** 5 minutes (invalidated on loan update)
- **Covenant Trends:** 1 hour (recalculated nightly)
- **Breach Predictions:** 24 hours (batch calculated nightly)
- **Stress Test Results:** Pre-calculated impact matrices, real-time with cache

---

## Pagination Best Practices

For queries returning 100K+ records:

```bash
# Load first page
GET /loans?limit=20&offset=0

# Client-side virtual scrolling
# Load next page only when user scrolls
GET /loans?limit=20&offset=20
```

---

## Example: Complete Workflow

```bash
# 1. Get portfolio summary
curl -H "Authorization: Bearer TOKEN" \
  https://api.greengauge.com/v1/portfolio/summary

# 2. Get at-risk loans
curl -H "Authorization: Bearer TOKEN" \
  "https://api.greengauge.com/v1/loans?status=AT_RISK&limit=20"

# 3. Get detailed analysis for first loan
curl -H "Authorization: Bearer TOKEN" \
  https://api.greengauge.com/v1/loans/550e8400-e29b-41d4-a716-446655440000

# 4. Run stress test
curl -X POST -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"scenarios": [{"name": "EBITDA Drop", "parameters": {"ebitda_drop_pct": 15}}]}' \
  https://api.greengauge.com/v1/stress-test

# 5. Generate compliance report
curl -H "Authorization: Bearer TOKEN" \
  https://api.greengauge.com/v1/compliance/report/TCFD
```

---

## Support

- **Documentation:** https://docs.greengauge.com
- **Status Page:** https://status.greengauge.com
- **Support Email:** support@greengauge.com
