"""
Covenant Breach Simulation Router
Stress testing and risk heatmap generation
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional
import uuid
from datetime import datetime

from app.database import get_db
from app.models import StressTestResult
from app.config import settings
from app.services.simulation_service import SimulationService

router = APIRouter()


class StressTestRequest(BaseModel):
    """Request model for stress test simulation"""
    ebitda_drop_percent: float = Field(..., ge=0, le=100, description="EBITDA drop percentage (0-100)")
    interest_rate_hike_bps: float = Field(..., ge=0, description="Interest rate hike in basis points")
    tenant_id: Optional[str] = None
    loan_ids: Optional[list[str]] = None  # Optional: filter to specific loans


class StressTestResponse(BaseModel):
    """Response model for stress test results"""
    test_id: str
    ebitda_drop_percent: float
    interest_rate_hike_bps: float
    risk_heatmap: dict
    created_at: str


@router.post("/simulate-stress-test", response_model=StressTestResponse)
async def simulate_stress_test(
    request: StressTestRequest,
    db: Session = Depends(get_db)
):
    """
    Simulate stress scenario and identify covenant breaches
    
    Takes stress parameters:
    - EBITDA drop percentage
    - Interest rate hike (basis points)
    
    Returns risk heatmap categorizing loans as:
    - "Breach": Covenant threshold exceeded
    - "At Risk": Within 5% of threshold
    - "Safe": Well within limits
    """
    tenant_id = request.tenant_id or settings.DEFAULT_TENANT_ID
    
    # Initialize simulation service
    sim_service = SimulationService()
    
    # Run simulation
    risk_heatmap = sim_service.simulate_stress_test(
        db=db,
        tenant_id=tenant_id,
        ebitda_drop_percent=request.ebitda_drop_percent,
        interest_rate_hike_bps=request.interest_rate_hike_bps
    )
    
    # Save results to database
    test_id = f"test-{uuid.uuid4().hex[:8]}"
    test_result = StressTestResult(
        id=test_id,
        tenant_id=tenant_id,
        ebitda_drop_percent=request.ebitda_drop_percent,
        interest_rate_hike_bps=request.interest_rate_hike_bps,
        total_loans_tested=risk_heatmap["summary"]["total_loans"],
        loans_breached=risk_heatmap["summary"]["loans_breached"],
        loans_at_risk=risk_heatmap["summary"]["loans_at_risk"],
        loans_safe=risk_heatmap["summary"]["loans_safe"],
        risk_heatmap=risk_heatmap
    )
    db.add(test_result)
    db.commit()
    
    return StressTestResponse(
        test_id=test_id,
        ebitda_drop_percent=request.ebitda_drop_percent,
        interest_rate_hike_bps=request.interest_rate_hike_bps,
        risk_heatmap=risk_heatmap,
        created_at=datetime.now().isoformat()
    )


@router.get("/simulate-stress-test/{test_id}")
async def get_stress_test_result(
    test_id: str,
    db: Session = Depends(get_db)
):
    """Retrieve a previously run stress test result"""
    test_result = db.query(StressTestResult).filter(
        StressTestResult.id == test_id
    ).first()
    
    if not test_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stress test result not found"
        )
    
    return {
        "test_id": test_result.id,
        "ebitda_drop_percent": test_result.ebitda_drop_percent,
        "interest_rate_hike_bps": test_result.interest_rate_hike_bps,
        "summary": {
            "total_loans_tested": test_result.total_loans_tested,
            "loans_breached": test_result.loans_breached,
            "loans_at_risk": test_result.loans_at_risk,
            "loans_safe": test_result.loans_safe
        },
        "risk_heatmap": test_result.risk_heatmap,
        "created_at": test_result.created_at.isoformat() if test_result.created_at else None
    }


@router.get("/simulate-stress-test")
async def list_stress_tests(
    tenant_id: Optional[str] = None,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """List recent stress test results"""
    tenant_id = tenant_id or settings.DEFAULT_TENANT_ID
    
    query = db.query(StressTestResult).filter(
        StressTestResult.tenant_id == tenant_id
    ).order_by(StressTestResult.created_at.desc()).limit(limit)
    
    results = query.all()
    
    return [
        {
            "test_id": r.id,
            "ebitda_drop_percent": r.ebitda_drop_percent,
            "interest_rate_hike_bps": r.interest_rate_hike_bps,
            "summary": {
                "total_loans_tested": r.total_loans_tested,
                "loans_breached": r.loans_breached,
                "loans_at_risk": r.loans_at_risk,
                "loans_safe": r.loans_safe
            },
            "created_at": r.created_at.isoformat() if r.created_at else None
        }
        for r in results
    ]

