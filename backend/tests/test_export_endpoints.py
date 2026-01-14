import os
import json
from datetime import datetime, timedelta

# Ensure test uses in-memory SQLite before importing app modules
os.environ.setdefault('DATABASE_URL', 'sqlite:///:memory:')

import pytest
from fastapi.testclient import TestClient


def setup_test_data(db_session):
    from app.models import Tenant, Loan, Covenant, StressTestResult
    from app.database import SessionLocal
    # Create a tenant
    tenant = Tenant(id='tenant-default', name='Test Tenant')
    db_session.add(tenant)

    # Create a loan
    loan = Loan(
        id='loan-0001',
        tenant_id='tenant-default',
        company_name='TestCo',
        borrower_name='TestCo Borrower',
        sector='Renewables',
        loan_amount=100.0,
        currency='EUR',
        origination_date=datetime.utcnow() - timedelta(days=365),
        maturity_date=datetime.utcnow() + timedelta(days=365*5),
        interest_rate=3.5,
        status='active'
    )
    db_session.add(loan)

    # Add a covenant
    covenant = Covenant(
        id='cov-0001',
        loan_id='loan-0001',
        clause_id='Clause 1',
        name='DSCR',
        threshold_value=1.25,
        operator='>=' ,
        current_value=1.5,
        status='compliant',
        cushion_percent=20.0
    )
    db_session.add(covenant)

    # Add a stress test result for export
    result = StressTestResult(
        id='stresstest-1',
        tenant_id='tenant-default',
        ebitda_drop_percent=10.0,
        interest_rate_hike_bps=50,
        total_loans_tested=1,
        loans_breached=0,
        loans_at_risk=0,
        loans_safe=1,
        risk_heatmap={'loans': []},
        created_by='tester'
    )
    db_session.add(result)

    db_session.commit()


def test_export_compliance_csv_and_excel():
    from app.database import SessionLocal, init_db
    from app.main import app

    # Initialize DB and create tables
    init_db()
    session = SessionLocal()
    setup_test_data(session)

    client = TestClient(app)

    # CSV export
    r = client.get('/api/v1/export-compliance-report?format=csv')
    assert r.status_code == 200
    assert 'text/csv' in r.headers.get('content-type', '')
    assert 'Content-Disposition' in r.headers

    # Excel export
    r2 = client.get('/api/v1/export-compliance-report?format=excel')
    assert r2.status_code == 200
    assert 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' in r2.headers.get('content-type', '')
    assert 'Content-Disposition' in r2.headers


def test_export_stress_test_csv_and_excel():
    from app.database import SessionLocal, init_db
    from app.main import app

    init_db()
    session = SessionLocal()
    setup_test_data(session)

    client = TestClient(app)

    r = client.get('/api/v1/export-stress-test/stresstest-1?format=csv')
    assert r.status_code == 200
    assert 'text/csv' in r.headers.get('content-type', '')

    r2 = client.get('/api/v1/export-stress-test/stresstest-1?format=excel')
    assert r2.status_code == 200
    assert 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' in r2.headers.get('content-type', '')
