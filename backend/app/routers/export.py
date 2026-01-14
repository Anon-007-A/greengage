"""
Export Router
Generate compliance reports in CSV/Excel format
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
import pandas as pd
import io
from datetime import datetime
import logging

from app.database import get_db
from app.models import Loan, Covenant, StressTestResult
from app.config import settings

router = APIRouter()

# Module logger
logger = logging.getLogger(__name__)


@router.get("/export-compliance-report")
async def export_compliance_report(
    tenant_id: Optional[str] = None,
    format: str = "csv",  # csv or excel
    db: Session = Depends(get_db)
):
    """
    Export comprehensive compliance report for credit committee
    
    Includes:
    - All loans with current covenant status
    - Breach indicators
    - Risk scores
    - Audit trail references
    """
    try:
        tenant_id = tenant_id or settings.DEFAULT_TENANT_ID

        # Query loans with covenants
        loans = db.query(Loan).filter(Loan.tenant_id == tenant_id).all()

        if not loans:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No loans found for export"
            )

        # Build report data
        report_rows = []

        for loan in loans:
            covenants = db.query(Covenant).filter(Covenant.loan_id == loan.id).all()

            if not covenants:
                # Include loan even without covenants
                report_rows.append({
                    "Loan ID": loan.id,
                    "Company Name": loan.company_name,
                    "Borrower": loan.borrower_name,
                    "Sector": loan.sector or "",
                    "Loan Amount": loan.loan_amount,
                    "Currency": loan.currency,
                    "Status": loan.status,
                    "Clause ID": "",
                    "Covenant Name": "",
                    "Current Value": "",
                    "Threshold": "",
                    "Operator": "",
                    "Covenant Status": "",
                    "Cushion %": "",
                    "Source Page": "",
                    "Last Updated": ""
                })
            else:
                    for covenant in covenants:
                        report_rows.append({
                        "Loan ID": loan.id,
                        "Company Name": loan.company_name,
                        "Borrower": loan.borrower_name,
                        "Sector": loan.sector or "",
                        "Loan Amount": loan.loan_amount,
                        "Currency": loan.currency,
                        "Status": loan.status,
                        "Clause ID": covenant.clause_id,
                        "Covenant Name": covenant.name,
                        "Current Value": covenant.current_value if covenant.current_value is not None else "",
                        "Threshold": covenant.threshold_value if covenant.threshold_value is not None else "",
                        "Operator": getattr(covenant.operator, 'value', "") if covenant.operator else "",
                        "Covenant Status": covenant.status.value if covenant.status else "",
                        "Cushion %": f"{covenant.cushion_percent:.2f}" if covenant.cushion_percent is not None else "",
                        "Source Page": covenant.page_number if covenant.page_number is not None else "",
                        "Last Updated": covenant.last_updated.strftime("%Y-%m-%d") if covenant.last_updated else ""
                    })

        # Create DataFrame
        df = pd.DataFrame(report_rows)

        # Generate file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        if format.lower() == "excel":
            try:
                output = io.BytesIO()
                # attempt to use openpyxl; if missing, fall back to csv below
                with pd.ExcelWriter(output, engine='openpyxl') as writer:
                    df.to_excel(writer, sheet_name='Compliance Report', index=False)
                output.seek(0)
                return StreamingResponse(
                    io.BytesIO(output.read()),
                    media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    headers={
                        "Content-Disposition": f"attachment; filename=compliance_report_{timestamp}.xlsx"
                    }
                )
            except Exception:
                # Log and fall back to CSV if Excel generation fails (missing engine etc.)
                logger.exception("[EXPORT] Excel export failed for compliance report; falling back to CSV")

        # CSV format or fallback
        output = io.StringIO()
        df.to_csv(output, index=False)
        output.seek(0)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode('utf-8')),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=compliance_report_{timestamp}.csv"
            }
        )

    except HTTPException:
        raise
    except Exception:
        # Return a clear 500 with logged error for easier debugging
        logger.exception("[EXPORT] Error generating compliance report")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error generating compliance report")


@router.get("/export-stress-test/{test_id}")
async def export_stress_test(
    test_id: str,
    format: str = "csv",
    db: Session = Depends(get_db)
):
    """Export specific stress test results"""
    try:
        test_result = db.query(StressTestResult).filter(
            StressTestResult.id == test_id
        ).first()

        if not test_result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Stress test result not found"
            )

        # Flatten risk heatmap for export
        report_rows = []
        risk_heatmap = test_result.risk_heatmap or {}

        for loan_data in risk_heatmap.get("loans", []):
            for covenant_data in loan_data.get("covenants", []):
                report_rows.append({
                    "Loan ID": loan_data.get("loan_id"),
                    "Company Name": loan_data.get("company_name"),
                    "Loan Amount": loan_data.get("loan_amount"),
                    "Covenant Name": covenant_data.get("name"),
                    "Clause ID": covenant_data.get("clause_id"),
                    "Current Value": covenant_data.get("current_value"),
                    "Stressed Value": covenant_data.get("stressed_value"),
                    "Threshold": covenant_data.get("threshold"),
                    "Status": covenant_data.get("status"),
                    "Cushion %": covenant_data.get("cushion_percent"),
                    "Breach Margin": covenant_data.get("breach_margin")
                })

        df = pd.DataFrame(report_rows)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        if format.lower() == "excel":
            try:
                output = io.BytesIO()
                with pd.ExcelWriter(output, engine='openpyxl') as writer:
                    # Summary sheet
                    summary_df = pd.DataFrame([{
                        "Test ID": test_id,
                        "EBITDA Drop %": test_result.ebitda_drop_percent,
                        "Interest Rate Hike (bps)": test_result.interest_rate_hike_bps,
                        "Total Loans": test_result.total_loans_tested,
                        "Loans Breached": test_result.loans_breached,
                        "Loans At Risk": test_result.loans_at_risk,
                        "Loans Safe": test_result.loans_safe
                    }])
                    summary_df.to_excel(writer, sheet_name='Summary', index=False)
                    df.to_excel(writer, sheet_name='Detailed Results', index=False)
                output.seek(0)
                return StreamingResponse(
                    io.BytesIO(output.read()),
                    media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    headers={
                        "Content-Disposition": f"attachment; filename=stress_test_{test_id}_{timestamp}.xlsx"
                    }
                )
            except Exception:
                logger.exception("[EXPORT] Excel export failed for stress test %s; falling back to CSV", test_id)

        output = io.StringIO()
        df.to_csv(output, index=False)
        output.seek(0)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode('utf-8')),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=stress_test_{test_id}_{timestamp}.csv"
            }
        )

    except HTTPException:
        raise
    except Exception:
        logger.exception("[EXPORT] Error generating stress test export for %s", test_id)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error generating stress test export")

