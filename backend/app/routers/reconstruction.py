"""
Reconstruction Router
Provides a complete set of endpoints used for the frontend during the emergency rebuild.
This router generates a deterministic set of 150 loans and offers endpoints for stress testing,
portfolio summary, scenario save/load and a simple PDF export.
"""
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse, StreamingResponse
from typing import List, Optional
import json
import io
from datetime import datetime, timedelta, timezone
import os

router = APIRouter()

# Deterministic loan generator for dev/test
SEED_COUNT = 150
SECTORS = [
    'Renewable Energy','Sustainable Construction','Green Transportation','Water Treatment','Agriculture','Forestry','Energy Storage','Waste Management'
]
COMPANY_PREFIXES = ['SolarGrid','GreenBuild','EcoTransport','CleanWater','WindPower','HydroWorks','AgriNova','ForestHoldings','UrbanRenew','BatteryCo']


def _generate_loans(count: int = SEED_COUNT):
    loans = []
    # Target total ~ €11.4B for 150 loans => ~76,000,000 per loan
    base_amount = 76_000_000
    for i in range(1, count + 1):
        idx = i - 1
        company = f"{COMPANY_PREFIXES[idx % len(COMPANY_PREFIXES)]} {i}"
        sector = SECTORS[idx % len(SECTORS)]
        # small deterministic variance around base_amount
        loan_amount = base_amount + (((i * 1234567) % 5_000_000) - 2_500_000)
        overall_risk = 20 + ((i * 7) % 70)
        status = 'active' if overall_risk < 60 else 'watchlist' if overall_risk < 80 else 'breached'
        covenant = {
            'id': f'cov-{i:03d}-1',
            'name': 'Debt-to-EBITDA',
            'current_value': round(1 + ((i * 13) % 500) / 100, 2),
            'threshold': 4.0,
            'operator': '<',
            'status': 'breached' if status == 'breached' else ('warning' if status == 'watchlist' else 'compliant'),
            'cushion_percent': round(((i * 11) % 80) - 20, 2)
        }

        loan = {
            'id': f'loan-{i:03d}',
            'company_name': company,
            'sector': sector,
            'loan_amount': loan_amount,
            'currency': 'EUR',
                'origination_date': (datetime.now(timezone.utc) - timedelta(days=365 * ((i % 5) + 1))).isoformat(),
                'maturity_date': (datetime.now(timezone.utc) + timedelta(days=365 * ((i % 10) + 1))).isoformat(),
            'interest_rate': round(1.5 + ((i * 9) % 350) / 100, 2),
            'status': status,
            'relationship_manager': ['J.Schmidt','H.Mueller','S.Bernard','E.Johansson','L.Rossi'][i % 5],
            'last_review_date': datetime.now(timezone.utc).isoformat(),
            'covenants': [covenant],
            'esg_metrics': [
                {'id': f'esg-{i:03d}-1','name':'CO2 Emissions Reduced','current_value': (i * 123) % 50000,'unit':'tonnes/year'}
            ],
            'risk_score': {
                'overall': overall_risk,
                'covenant_component': max(0, overall_risk - 10),
                'impact_component': min(100, overall_risk + 5)
            }
        }
        loans.append(loan)
    return loans


_LOANS_CACHE = _generate_loans()

# Scenario persistence path
_SCENARIO_PATH = os.path.join(os.path.dirname(__file__), '..', '..', '.scenario.json')


@router.get('/loans')
def get_loans(skip: int = 0, limit: int = 25, search: Optional[str] = None):
    # Support pagination and search for frontend compatibility
    filtered = _LOANS_CACHE
    if search:
        q = search.lower()
        filtered = [l for l in filtered if q in l['company_name'].lower() or q in l['id'].lower() or q in l.get('sector','').lower()]

    total = len(filtered)
    start = max(0, skip)
    end = start + (limit or 25)
    page = filtered[start:end]

    return JSONResponse(content={
        'total': len(_LOANS_CACHE),
        'skip': skip,
        'limit': limit,
        'count': len(page),
        'loans': page
    })


@router.get('/loans/{loan_id}', response_model=dict)
def get_loan(loan_id: str):
    loan = next((l for l in _LOANS_CACHE if l['id'] == loan_id), None)
    if not loan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Loan not found')
    return JSONResponse(content=loan)


@router.post('/stress-test')
def post_stress_test(payload: dict):
    # Expect { ebitdaDropPercent: number, interestRateHikeBps: number }
    e = float(payload.get('ebitdaDropPercent', 0))
    r = float(payload.get('interestRateHikeBps', 0))

    stressed = []
    breached = 0
    at_risk = 0
    safe = 0
    for loan in _LOANS_CACHE:
        base = float(loan['risk_score']['overall'])
        adj = base + e * 0.8 + (r / 10) * 0.5
        status = 'active'
        if adj >= 80:
            status = 'breached'
            breached += 1
        elif adj >= 30:
            status = 'watchlist'
            at_risk += 1
        else:
            safe += 1
        stressed.append({
            **loan,
            'stressed_risk': round(adj, 2),
            'stressed_status': status
        })

    result = {
        'ebitdaDropPercent': e,
        'interestRateHikeBps': r,
        'totalLoans': len(_LOANS_CACHE),
        'breachedCount': breached,
        'atRiskCount': at_risk,
        'safeCount': safe,
        'loans': stressed
    }
    return JSONResponse(content=result)


@router.get('/portfolio/summary')
def get_portfolio_summary():
    total_value = sum(l['loan_amount'] for l in _LOANS_CACHE)
    avg_risk = sum(l['risk_score']['overall'] for l in _LOANS_CACHE) / len(_LOANS_CACHE)
    breached = sum(1 for l in _LOANS_CACHE if l['status'] == 'breached')
    at_risk = sum(1 for l in _LOANS_CACHE if l['status'] == 'watchlist')
    safe = sum(1 for l in _LOANS_CACHE if l['status'] == 'active')
    return JSONResponse(content={
        'totalValue': total_value,
        'riskScore': round(avg_risk, 2),
        'breachedCount': breached,
        'atRiskCount': at_risk,
        'safeCount': safe,
        'totalLoans': len(_LOANS_CACHE)
    })


@router.post('/scenario')
def post_scenario(payload: dict):
    # Save scenario to disk for persistence
    try:
        with open(_SCENARIO_PATH, 'w', encoding='utf-8') as fh:
            json.dump({
                'payload': payload,
                    'saved_at': datetime.now(timezone.utc).isoformat()
            }, fh)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return JSONResponse(content={'status': 'ok', 'saved': payload})


@router.get('/scenario')
def get_scenario():
    if not os.path.exists(_SCENARIO_PATH):
        return JSONResponse(content={'payload': None})
    try:
        with open(_SCENARIO_PATH, 'r', encoding='utf-8') as fh:
            data = json.load(fh)
        return JSONResponse(content=data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post('/export-pdf')
def export_pdf(format: Optional[str] = 'pdf'):
    # Create a simple PDF listing loans. Use a lightweight approach to avoid heavy deps.
    try:
        from fpdf import FPDF
    except Exception:
        raise HTTPException(status_code=500, detail='PDF library not installed')

    pdf = FPDF()
    pdf.set_auto_page_break(True, margin=15)
    pdf.add_page()
    pdf.set_font('Arial', 'B', 14)
    pdf.cell(0, 10, 'Portfolio Loans Export', ln=1)
    pdf.set_font('Arial', '', 10)
    for loan in _LOANS_CACHE:
        pdf.cell(0, 6, f"{loan['id']} - {loan['company_name']} - €{loan['loan_amount']}", ln=1)

    output = io.BytesIO()
    output.write(pdf.output(dest='S').encode('latin-1'))
    output.seek(0)

    return StreamingResponse(output, media_type='application/pdf', headers={
        'Content-Disposition': f'attachment; filename=loans_export_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.pdf'
    })
