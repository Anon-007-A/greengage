"""
Enhanced Loans Router with Mock Data
Includes all required endpoints for GreenGauge API
"""
from fastapi import APIRouter, Query, HTTPException, status
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import random

from app.mock_data_generator import generate_loans, get_portfolio_summary

router = APIRouter()

# Initialize mock data once
_mock_loans_cache = None
_mock_loans_cache_ts = None
_portfolio_summary_cache = None

# Simple in-memory TTL cache for 5 minutes
CACHE_TTL_SECONDS = 300

def get_mock_loans():
    """Get or generate mock loans"""
    global _mock_loans_cache
    global _mock_loans_cache_ts
    now = datetime.utcnow()
    if _mock_loans_cache is None or _mock_loans_cache_ts is None or (now - _mock_loans_cache_ts).total_seconds() > CACHE_TTL_SECONDS:
        # Generate 150 loans with realistic 70/20/10 distribution
        _mock_loans_cache = generate_loans(150, distribution={"low":70, "high":20, "critical":10})
        _mock_loans_cache_ts = now
    return _mock_loans_cache

def get_portfolio_summary_data():
    """Get portfolio summary"""
    global _portfolio_summary_cache
    loans = get_mock_loans()
    return get_portfolio_summary(loans)


# ============================================================================
# LOAN LISTING & SEARCH
# ============================================================================

@router.get("/loans")
async def list_loans(
    skip: int = Query(0, ge=0),
    limit: int = Query(25, ge=1, le=1000),
    sector: Optional[str] = None,
    risk_level: Optional[str] = None,
    covenant_status: Optional[str] = None,
    filter: Optional[str] = None,
    search: Optional[str] = None,
):
    """
    List loans with pagination and filtering.
    
    Query Parameters:
    - skip: Number of loans to skip (default: 0)
    - limit: Number of loans to return (default: 25, max: 100)
    - sector: Filter by sector (e.g., "Renewable Energy", "Sustainable Transport")
    - risk_level: Filter by risk level ("low", "high", "critical")
    - covenant_status: Filter by covenant status ("compliant", "at_risk", "breached")
    """
    loans = get_mock_loans()
    
    # Apply filters
    filtered_loans = loans
    
    if sector:
        filtered_loans = [l for l in filtered_loans if l["sector"].lower() == sector.lower()]
    
    if risk_level:
        filtered_loans = [l for l in filtered_loans if l["riskScore"]["level"] == risk_level]
    
    if covenant_status:
        filtered_loans = [
            l for l in filtered_loans
            if any(c["status"] == covenant_status for c in l["covenants"])
        ]
    
    # Support legacy 'filter' query values like 'atrisk' or 'breached' or 'safe'
    if filter:
        f = filter.lower()
        if f in ("atrisk", "at_risk"):
            filtered_loans = [l for l in filtered_loans if any(c["status"] == "at_risk" for c in l["covenants"]) and not any(c["status"] == "breached" for c in l["covenants"]) ]
        elif f in ("breached", "breach"):
            filtered_loans = [l for l in filtered_loans if any(c["status"] == "breached" for c in l["covenants"]) ]
        elif f in ("safe", "compliant"):
            filtered_loans = [l for l in filtered_loans if not any(c["status"] in ("at_risk","breached") for c in l["covenants"]) ]

    # Search across companyName, sector, and covenant names
    if search:
        q = search.lower()
        def matches(l):
            if q in l.get("companyName","").lower():
                return True
            if q in l.get("sector","").lower():
                return True
            for c in l.get("covenants", []):
                if q in c.get("name","" ).lower():
                    return True
            return False
        filtered_loans = [l for l in filtered_loans if matches(l)]
    
    total = len(filtered_loans)
    paginated = filtered_loans[skip : skip + limit]
    
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "count": len(paginated),
        "loans": paginated
    }


@router.post("/loans/export")
async def export_loans_csv(
    status: Optional[str] = None,
    search: Optional[str] = None
):
    """Export loans as CSV. Optional filters: status, search"""
    import csv
    from fastapi.responses import StreamingResponse

    loans = get_mock_loans()

    # Apply optional filters
    filtered = loans
    if status:
        s = status.lower()
        if s in ("at_risk", "atrisk"):
            filtered = [l for l in filtered if any(c["status"] == "at_risk" for c in l["covenants"]) ]
        elif s in ("breached", "breach"):
            filtered = [l for l in filtered if any(c["status"] == "breached" for c in l["covenants"]) ]
        elif s in ("compliant", "safe"):
            filtered = [l for l in filtered if not any(c["status"] in ("at_risk","breached") for c in l["covenants"]) ]

    if search:
        q = search.lower()
        def matches(l):
            if q in l.get("companyName","").lower():
                return True
            if q in l.get("sector","" ).lower():
                return True
            for c in l.get("covenants", []):
                if q in c.get("name","" ).lower():
                    return True
            return False
        filtered = [l for l in filtered if matches(l)]

    def iter_csv():
        header = ["loanId","companyName","sector","amount","status","riskScore"]
        yield ",".join(header) + "\n"
        for l in filtered:
            row = [
                l.get("id",""),
                l.get("companyName",""),
                l.get("sector",""),
                str(l.get("loanAmount",0)),
                next((c for c in ["COMPLIANT","AT_RISK","BREACHED"] if any(x for x in l.get("covenants",[]) if x.get("status") and (x.get("status").upper()==c or (c=="AT_RISK" and x.get("status")=="at_risk")))), "COMPLIANT"),
                str(l.get("riskScore",{}).get("overall",""))
            ]
            yield ",".join([f'"{v}"' for v in row]) + "\n"

    return StreamingResponse(iter_csv(), media_type="text/csv", headers={"Content-Disposition":"attachment; filename=loans_export.csv"})


@router.get("/loans/{loan_id}")
async def get_loan_detail(loan_id: str):
    """Get detailed information for a specific loan."""
    loans = get_mock_loans()
    loan = next((l for l in loans if l["id"] == loan_id), None)
    
    if not loan:
        raise HTTPException(status_code=404, detail=f"Loan {loan_id} not found")
    
    return loan


@router.get("/loans/search")
async def search_loans(q: str = Query(..., min_length=1)):
    """
    Full-text search loans by company name, sector, or ID.
    """
    loans = get_mock_loans()
    query_lower = q.lower()
    
    results = [
        l for l in loans
        if query_lower in l["companyName"].lower()
        or query_lower in l["sector"].lower()
        or query_lower in l["id"].lower()
    ]
    
    return {"query": q, "results": results, "count": len(results)}


# ============================================================================
# COVENANT ENDPOINTS
# ============================================================================

@router.get("/loans/{loan_id}/covenants")
async def get_loan_covenants(loan_id: str):
    """Get all covenants for a loan with their current status."""
    loans = get_mock_loans()
    loan = next((l for l in loans if l["id"] == loan_id), None)
    
    if not loan:
        raise HTTPException(status_code=404, detail=f"Loan {loan_id} not found")
    
    return {
        "loanId": loan_id,
        "companyName": loan["companyName"],
        "covenantCount": len(loan["covenants"]),
        "covenants": loan["covenants"],
        "summary": {
            "compliant": sum(1 for c in loan["covenants"] if c["status"] == "compliant"),
            "at_risk": sum(1 for c in loan["covenants"] if c["status"] == "at_risk"),
            "breached": sum(1 for c in loan["covenants"] if c["status"] == "breached"),
        }
    }


@router.post("/loans/{loan_id}/covenants")
async def submit_covenant_data(
    loan_id: str,
    covenant_data: Dict[str, Any]
):
    """
    Submit updated covenant data for a loan.
    
    Expected JSON:
    {
        "covenantId": "cov-xxx",
        "currentValue": 3.2,
        "submissionDate": "2024-12-20",
        "source": "Q4 Financial Statements"
    }
    """
    loans = get_mock_loans()
    loan = next((l for l in loans if l["id"] == loan_id), None)
    
    if not loan:
        raise HTTPException(status_code=404, detail=f"Loan {loan_id} not found")
    
    covenant = next(
        (c for c in loan["covenants"] if c.get("id") == covenant_data.get("covenantId")),
        None
    )
    
    if not covenant:
        raise HTTPException(status_code=404, detail="Covenant not found")
    
    # Update covenant value
    old_value = covenant["currentValue"]
    new_value = covenant_data.get("currentValue", old_value)
    
    # Recalculate status
    threshold = covenant["threshold"]
    operator = "<"  # Most financial covenants are "<" (lower is better)
    
    is_breached = new_value >= threshold
    cushion = max(0, ((threshold - new_value) / threshold) * 100) if not is_breached else 0
    
    if is_breached:
        new_status = "breached"
    elif cushion < 5:
        new_status = "at_risk"
    else:
        new_status = "compliant"
    
    covenant["currentValue"] = new_value
    covenant["status"] = new_status
    covenant["cushionPercent"] = round(cushion, 1)
    covenant["lastUpdated"] = datetime.now().isoformat()
    
    return {
        "success": True,
        "loan_id": loan_id,
        "covenant_id": covenant_data.get("covenantId"),
        "old_value": old_value,
        "new_value": new_value,
        "new_status": new_status,
        "cushion_percent": covenant["cushionPercent"],
        "submission_date": covenant_data.get("submissionDate")
    }


# ============================================================================
# ESG METRICS
# ============================================================================

@router.get("/loans/{loan_id}/esg")
async def get_loan_esg_metrics(loan_id: str):
    """Get ESG metrics and progress for a loan."""
    loans = get_mock_loans()
    loan = next((l for l in loans if l["id"] == loan_id), None)
    
    if not loan:
        raise HTTPException(status_code=404, detail=f"Loan {loan_id} not found")
    
    verified_count = sum(1 for m in loan["esgMetrics"] if m["verificationStatus"] == "verified")
    
    return {
        "loanId": loan_id,
        "companyName": loan["companyName"],
        "sector": loan["sector"],
        "metricsCount": len(loan["esgMetrics"]),
        "verifiedMetrics": verified_count,
        "metrics": loan["esgMetrics"],
        "overallProgress": round(
            sum(m["progressPercent"] for m in loan["esgMetrics"]) / len(loan["esgMetrics"]),
            1
        ) if loan["esgMetrics"] else 0
    }


# ============================================================================
# PORTFOLIO LEVEL ENDPOINTS
# ============================================================================

@router.get("/portfolio/summary")
async def get_portfolio_summary():
    """Get portfolio-level summary metrics."""
    summary = get_portfolio_summary_data()
    return summary


@router.get("/portfolio/risk-score")
async def get_portfolio_risk_score():
    """
    Get aggregate portfolio risk score and distribution.
    
    Response includes:
    - Overall portfolio risk score (0-100)
    - Distribution by risk level
    - Covenant breach forecast
    - Recommendations
    """
    loans = get_mock_loans()
    summary = get_portfolio_summary_data()
    
    # Calculate detailed risk metrics
    breached_loans = [l for l in loans if l["riskScore"]["level"] == "critical"]
    at_risk_loans = [l for l in loans if l["riskScore"]["level"] == "high"]
    
    total_at_risk_amount = sum(l["loanAmount"] for l in at_risk_loans)
    total_breached_amount = sum(l["loanAmount"] for l in breached_loans)
    
    return {
        "portfolioRiskScore": summary["averageRiskScore"],
        "riskDistribution": summary["riskDistribution"],
        "riskByAmount": {
            "safe": sum(
                l["loanAmount"] for l in loans if l["riskScore"]["level"] == "low"
            ),
            "atRisk": total_at_risk_amount,
            "breached": total_breached_amount,
        },
        "breachMetrics": {
            "currentBreach": len(breached_loans),
            "atRiskLoans": len(at_risk_loans),
            "estimatedNextBreach": random.randint(45, 90),  # days
        },
        "recommendations": [
            f"Review {len(at_risk_loans)} loans in 'at risk' category",
            f"Total at-risk exposure: €{total_at_risk_amount / 1e6:.1f}M",
            "Prioritize covenant waivers for top 3 exposure loans",
            "Schedule management discussions with 2+ covenant breaches"
        ],
        "lastCalculated": datetime.now().isoformat()
    }


@router.post("/stress-test")
async def run_stress_test(payload: Dict[str, Any]):
    """Run a stress test against the mock loans.

    Payload expected:
    {
      "ebitdaDrop": 0-30,   # percent drop e.g., 10
      "interestRateHike": 0-5  # absolute points e.g., 1.5
    }
    """
    loans = get_mock_loans()
    ebitda_drop = float(payload.get("ebitdaDrop", 0))
    interest_hike = float(payload.get("interestRateHike", 0))

    baseline_breached = 0
    baseline_at_risk = 0
    stressed_breached = 0
    stressed_at_risk = 0
    impacted = []

    for loan in loans:
        # baseline counts
        b_breached = any(c["status"] == "breached" for c in loan["covenants"])
        b_at_risk = any(c["status"] == "at_risk" for c in loan["covenants"]) and not b_breached
        baseline_breached += 1 if b_breached else 0
        baseline_at_risk += 1 if b_at_risk else 0

        # simulate impact: adjust covenant currentValue according to covenant type
        new_covenants = []
        new_breached = False
        new_at_risk = False

        for c in loan["covenants"]:
            name = c.get("name", "").lower()
            current = float(c.get("currentValue", 0))
            threshold = float(c.get("threshold", 0))

            # EBITDA drop increases leverage-style ratios (Debt/EBITDA, Leverage) -> multiply current
            if "debt" in name or "leverage" in name or "ebitda" in name:
                current = current * (1 + ebitda_drop / 100.0)

            # interest rate hike reduces coverage ratios (Interest Coverage, DSCR)
            if "interest" in name or "dscr" in name:
                # assume interest rate hike reduces coverage by proportional amount
                current = current * (1 + (interest_hike / 100.0) * 1.5)

            status = "compliant"
            if current >= threshold:
                status = "breached"
                new_breached = True
            elif current >= threshold * 0.95:
                status = "at_risk"
                new_at_risk = True

            new_covenants.append({**c, "simulatedCurrent": round(current, 2), "simulatedStatus": status})

        if new_breached:
            stressed_breached += 1
        elif new_at_risk:
            stressed_at_risk += 1

        if new_breached or new_at_risk:
            impacted.append({
                "loanId": loan["id"],
                "companyName": loan["companyName"],
                "baselineBreached": b_breached,
                "baselineAtRisk": b_at_risk,
                "stressedBreached": new_breached,
                "stressedAtRisk": new_at_risk,
                "changedCov": [c for c in new_covenants if c.get("simulatedStatus") != c.get("status")]
            })

    return {
        "ebitdaDrop": ebitda_drop,
        "interestRateHike": interest_hike,
        "baseline": {"breached": baseline_breached, "atRisk": baseline_at_risk},
        "stressed": {"breached": stressed_breached, "atRisk": stressed_at_risk},
        "impactedLoans": impacted,
        "loansAnalyzed": len(loans)
    }


# ============================================================================
# STRESS TESTING & SCENARIOS
# ============================================================================

@router.get("/api/scenarios/{scenario_id}")
async def get_scenario_results(scenario_id: str):
    """Get results for a stress test scenario."""
    loans = get_mock_loans()
    
    # Map scenario types
    scenario_map = {
        "baseline": {"rate_change": 0, "ebitda_change": 0, "name": "Baseline (No Stress)"},
        "rate_plus_2": {"rate_change": 2.0, "ebitda_change": 0, "name": "Interest Rate +2%"},
        "ebitda_minus_10": {"rate_change": 0, "ebitda_change": -10, "name": "EBITDA -10%"},
        "esg_miss": {"rate_change": 0, "ebitda_change": 0, "esg_penalty": True, "name": "ESG Targets Missed"},
        "combined": {"rate_change": 2.0, "ebitda_change": -10, "esg_penalty": True, "name": "Combined Stress"}
    }
    
    if scenario_id not in scenario_map:
        raise HTTPException(status_code=404, detail=f"Scenario {scenario_id} not found")
    
    scenario = scenario_map[scenario_id]
    results = []
    
    for loan in loans[:20]:  # Simulate for subset
        baseline_breaches = sum(1 for c in loan["covenants"] if c["status"] == "breached")
        
        # Simulate stress impact
        stress_breaches = baseline_breaches
        if scenario.get("rate_change") > 0:
            stress_breaches += random.randint(0, 2)
        if scenario.get("ebitda_change") < 0:
            stress_breaches += random.randint(0, 3)
        if scenario.get("esg_penalty"):
            stress_breaches += random.randint(0, 1)
        
        results.append({
            "loanId": loan["id"],
            "companyName": loan["companyName"],
            "baselineBreaches": baseline_breaches,
            "stressBreaches": min(stress_breaches, len(loan["covenants"])),
            "newBreaches": max(0, stress_breaches - baseline_breaches),
            "impactPercent": round((stress_breaches - baseline_breaches) / max(1, len(loan["covenants"])) * 100, 1)
        })
    
    total_new_breaches = sum(r["newBreaches"] for r in results)
    
    return {
        "scenarioId": scenario_id,
        "scenarioName": scenario["name"],
        "loansAnalyzed": len(results),
        "totalNewBreaches": total_new_breaches,
        "affectedLoans": sum(1 for r in results if r["newBreaches"] > 0),
        "results": results,
        "summary": {
            "worstCaseBreaches": max((r["stressBreaches"] for r in results), default=0),
            "averageImpact": round(sum(r["impactPercent"] for r in results) / len(results), 1) if results else 0
        }
    }


# ============================================================================
# COMPLIANCE & REPORTING
# ============================================================================

@router.get("/compliance/csrd-report")
async def get_csrd_compliance_report(
    period: str = Query("Q4-2024"),
    format: str = Query("json")
):
    """
    Generate CSRD (Corporate Sustainability Reporting Directive) compliance report.
    
    Includes:
    - ESG aggregates by disclosure topic
    - Verified vs pending metrics
    - Compliance status with EU Taxonomy
    - TCFD recommendations alignment
    """
    loans = get_mock_loans()
    summary = get_portfolio_summary_data()
    
    # Aggregate ESG by category
    esg_by_category = {"environmental": [], "social": [], "governance": []}
    for loan in loans:
        for metric in loan["esgMetrics"]:
            esg_by_category[metric["category"]].append(metric)
    
    return {
        "reportPeriod": period,
        "portfolioSize": len(loans),
        "totalExposure": summary["totalAmount"],
        "esgAggregates": {
            "environmental": {
                "metricsCount": len(esg_by_category["environmental"]),
                "verifiedCount": sum(
                    1 for m in esg_by_category["environmental"]
                    if m["verificationStatus"] == "verified"
                ),
                "averageProgress": round(
                    sum(m["progressPercent"] for m in esg_by_category["environmental"]) 
                    / max(1, len(esg_by_category["environmental"])),
                    1
                )
            },
            "social": {
                "metricsCount": len(esg_by_category["social"]),
                "verifiedCount": sum(
                    1 for m in esg_by_category["social"]
                    if m["verificationStatus"] == "verified"
                ),
                "averageProgress": round(
                    sum(m["progressPercent"] for m in esg_by_category["social"]) 
                    / max(1, len(esg_by_category["social"])),
                    1
                )
            },
            "governance": {
                "metricsCount": len(esg_by_category["governance"]),
                "verifiedCount": sum(
                    1 for m in esg_by_category["governance"]
                    if m["verificationStatus"] == "verified"
                ),
                "averageProgress": round(
                    sum(m["progressPercent"] for m in esg_by_category["governance"]) 
                    / max(1, len(esg_by_category["governance"])),
                    1
                )
            }
        },
        "complianceStatus": {
            "euTaxonomyAligned": round(len(loans) * 0.75),
            "tcfdDisclosed": round(len(loans) * 0.68),
            "sfdrLevel3": round(len(loans) * 0.45)
        },
        "recommendations": [
            "Increase verified ESG submissions to 95% by Q2 2025",
            "Implement EU Taxonomy mapping for all loans",
            "Add TCFD climate risk disclosures"
        ],
        "generatedAt": datetime.now().isoformat()
    }


# ============================================================================
# FORECASTING & ML-LIKE ENDPOINTS
# ============================================================================

@router.post("/covenants/forecast")
async def forecast_covenant_breach(
    historical_data: Dict[str, Any]
):
    """
    Forecast covenant breach probability based on historical trend.
    
    Expected input:
    {
        "loanId": "loan-001",
        "covenantId": "cov-001-1",
        "historicalValues": [2.8, 2.9, 3.1],
        "historicalDates": ["2024-10-20", "2024-11-20", "2024-12-20"]
    }
    """
    # Simple trend analysis
    values = historical_data.get("historicalValues", [])
    threshold = historical_data.get("threshold", 4.0)
    
    if len(values) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 historical data points")
    
    # Calculate trend
    trend_value = (values[-1] - values[0]) / len(values)
    
    # Project forward 12 months
    months_to_breach = None
    if trend_value > 0:  # Deteriorating
        months_to_breach = int((threshold - values[-1]) / trend_value)
    
    breach_probability = min(100, max(0, 50 + (trend_value * 1000)))
    
    return {
        "loanId": historical_data.get("loanId"),
        "covenantId": historical_data.get("covenantId"),
        "currentValue": values[-1],
        "threshold": threshold,
        "trend": "deteriorating" if trend_value > 0 else "improving",
        "breachProbability": round(breach_probability, 1),
        "estimatedMonthsToBreach": months_to_breach,
        "confidence": 0.72,
        "recommendations": [
            "Monitor quarterly and discuss with borrower" if breach_probability > 30
            else "Current trajectory acceptable"
        ]
    }


# ============================================================================
# DATA IMPORT
# ============================================================================

@router.post("/data-import")
async def import_loan_data(
    import_data: Dict[str, Any]
):
    """
    Import loan data from external sources (CSV, JSON, etc).
    
    Expected format:
    {
        "source": "bloomberg" | "refinitiv" | "custom",
        "fileFormat": "csv" | "json",
        "dataPoints": [...]
    }
    """
    source = import_data.get("source", "custom")
    file_format = import_data.get("fileFormat", "json")
    
    return {
        "status": "success",
        "message": f"Data import from {source} ({file_format}) initiated",
        "recordsProcessed": len(import_data.get("dataPoints", [])),
        "validationErrors": 0,
        "importId": f"import-{datetime.now().timestamp()}",
        "timestamp": datetime.now().isoformat()
    }
