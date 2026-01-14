"""
Loans Router
CRUD operations for loans and covenants
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models import Loan, Covenant, Tenant
from app.config import settings

router = APIRouter()


class LoanResponse(BaseModel):
    """Loan response model"""
    id: str
    company_name: str
    borrower_name: str
    sector: Optional[str]
    loan_amount: float
    currency: str
    status: str
    covenants: List[dict]


@router.get("/loans")
async def list_loans(
    tenant_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all loans for a tenant"""
    tenant_id = tenant_id or settings.DEFAULT_TENANT_ID
    
    query = db.query(Loan).filter(Loan.tenant_id == tenant_id)
    
    if status_filter:
        query = query.filter(Loan.status == status_filter)
    
    loans = query.all()
    
    result = []
    for loan in loans:
        covenants = db.query(Covenant).filter(Covenant.loan_id == loan.id).all()
        result.append({
            "id": loan.id,
            "company_name": loan.company_name,
            "borrower_name": loan.borrower_name,
            "sector": loan.sector,
            "loan_amount": loan.loan_amount,
            "currency": loan.currency,
            "status": loan.status,
            "covenants": [
                {
                    "id": c.id,
                    "clause_id": c.clause_id,
                    "name": c.name,
                    "current_value": c.current_value,
                    "threshold_value": c.threshold_value,
                    "operator": c.operator.value,
                    "status": c.status.value if c.status else None,
                    "cushion_percent": c.cushion_percent
                }
                for c in covenants
            ]
        })
    
    return result


@router.get("/loans/{loan_id}")
async def get_loan(
    loan_id: str,
    db: Session = Depends(get_db)
):
    """Get detailed loan information"""
    loan = db.query(Loan).filter(Loan.id == loan_id).first()
    
    if not loan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loan not found"
        )
    
    covenants = db.query(Covenant).filter(Covenant.loan_id == loan_id).all()
    
    return {
        "id": loan.id,
        "company_name": loan.company_name,
        "borrower_name": loan.borrower_name,
        "sector": loan.sector,
        "loan_amount": loan.loan_amount,
        "currency": loan.currency,
        "origination_date": loan.origination_date.isoformat() if loan.origination_date else None,
        "maturity_date": loan.maturity_date.isoformat() if loan.maturity_date else None,
        "interest_rate": loan.interest_rate,
        "status": loan.status,
        "relationship_manager": loan.relationship_manager,
        "covenants": [
            {
                "id": c.id,
                "clause_id": c.clause_id,
                "name": c.name,
                "type": c.type,
                "current_value": c.current_value,
                "threshold_value": c.threshold_value,
                "operator": c.operator.value,
                "unit": c.unit,
                "status": c.status.value if c.status else None,
                "cushion_percent": c.cushion_percent,
                "frequency": c.frequency.value if c.frequency else None,
                "source_text": c.source_text,
                "page_number": c.page_number,
                "last_updated": c.last_updated.isoformat() if c.last_updated else None
            }
            for c in covenants
        ]
    }


@router.put("/covenants/{covenant_id}/value")
async def update_covenant_value(
    covenant_id: str,
    current_value: float,
    db: Session = Depends(get_db)
):
    """Update covenant current value (e.g., from quarterly reporting)"""
    covenant = db.query(Covenant).filter(Covenant.id == covenant_id).first()
    
    if not covenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Covenant not found"
        )
    
    # Calculate new status
    threshold = covenant.threshold_value
    operator = covenant.operator
    
    is_breached = False
    if operator.value == "<":
        is_breached = current_value >= threshold
    elif operator.value == "<=":
        is_breached = current_value > threshold
    elif operator.value == ">":
        is_breached = current_value <= threshold
    elif operator.value == ">=":
        is_breached = current_value < threshold
    
    # Calculate cushion
    if operator.value in ["<", "<="]:
        cushion = ((threshold - current_value) / threshold) * 100
    else:
        cushion = ((current_value - threshold) / threshold) * 100
    
    # Determine status
    if is_breached:
        from app.models import CovenantStatus
        new_status = CovenantStatus.BREACH
    elif cushion < 5:
        new_status = CovenantStatus.WARNING
    else:
        new_status = CovenantStatus.COMPLIANT
    
    # Update covenant
    old_value = covenant.current_value
    old_status = covenant.status
    
    covenant.current_value = current_value
    covenant.status = new_status
    covenant.cushion_percent = cushion
    covenant.last_updated = datetime.now()
    
    db.commit()
    
    return {
        "covenant_id": covenant.id,
        "old_value": old_value,
        "new_value": current_value,
        "old_status": old_status.value if old_status else None,
        "new_status": new_status.value,
        "cushion_percent": cushion
    }

