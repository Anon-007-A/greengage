"""
Covenant Breach Simulation Service
Simulates stress scenarios and calculates breach probabilities
"""
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models import Loan, Covenant, CovenantOperator, CovenantStatus


class SimulationService:
    """Service for stress testing and covenant breach simulation"""
    
    @staticmethod
    def calculate_stressed_ratio(
        current_value: float,
        ebitda_drop_percent: float,
        interest_rate_hike_bps: float,
        ratio_type: str
    ) -> float:
        """
        Calculate ratio value under stress scenario
        
        Args:
            current_value: Current ratio value
            ebitda_drop_percent: Percentage drop in EBITDA (e.g., 20 for 20%)
            interest_rate_hike_bps: Interest rate increase in basis points (e.g., 100 for 1%)
            ratio_type: Type of ratio (debt_ebitda, interest_coverage, dscr, etc.)
        """
        ebitda_multiplier = 1 - (ebitda_drop_percent / 100)
        rate_multiplier = 1 + (interest_rate_hike_bps / 10000)
        
        if "debt_ebitda" in ratio_type.lower() or "leverage" in ratio_type.lower():
            # Debt/EBITDA: If EBITDA drops, ratio increases
            return current_value / ebitda_multiplier
        
        elif "interest_coverage" in ratio_type.lower() or "interest_cover" in ratio_type.lower():
            # Interest Coverage = EBITDA / Interest Expense
            # If EBITDA drops and interest rises, coverage drops significantly
            return current_value * ebitda_multiplier / rate_multiplier
        
        elif "dscr" in ratio_type.lower() or "debt_service" in ratio_type.lower():
            # DSCR = (EBITDA - CapEx) / Debt Service
            # Similar to interest coverage
            return current_value * ebitda_multiplier / rate_multiplier
        
        elif "current_ratio" in ratio_type.lower():
            # Current ratio less sensitive to EBITDA/interest changes
            # Assume 10% impact from working capital stress
            return current_value * 0.9
        
        else:
            # Default: assume proportional to EBITDA drop
            return current_value / ebitda_multiplier
    
    @staticmethod
    def check_covenant_breach(
        covenant: Covenant,
        stressed_value: float
    ) -> Dict[str, Any]:
        """
        Check if covenant is breached under stress scenario
        
        Returns:
            {
                "status": "breach" | "at_risk" | "safe",
                "stressed_value": float,
                "threshold": float,
                "cushion_percent": float,
                "breach_margin": float
            }
        """
        threshold = covenant.threshold_value
        operator = covenant.operator
        
        # Determine if breached based on operator
        is_breached = False
        if operator == CovenantOperator.LESS_THAN:
            is_breached = stressed_value >= threshold
        elif operator == CovenantOperator.LESS_THAN_EQUAL:
            is_breached = stressed_value > threshold
        elif operator == CovenantOperator.GREATER_THAN:
            is_breached = stressed_value <= threshold
        elif operator == CovenantOperator.GREATER_THAN_EQUAL:
            is_breached = stressed_value < threshold
        
        # Calculate cushion and margin
        if operator in [CovenantOperator.LESS_THAN, CovenantOperator.LESS_THAN_EQUAL]:
            # For ratios that must stay below threshold
            cushion = ((threshold - stressed_value) / threshold) * 100
            breach_margin = stressed_value - threshold
        else:
            # For ratios that must stay above threshold
            cushion = ((stressed_value - threshold) / threshold) * 100
            breach_margin = threshold - stressed_value
        
        # Determine status
        if is_breached:
            status = "breach"
        elif cushion < 5:  # Within 5% of threshold
            status = "at_risk"
        else:
            status = "safe"
        
        return {
            "covenant_id": covenant.id,
            "clause_id": covenant.clause_id,
            "name": covenant.name,
            "status": status,
            "current_value": covenant.current_value,
            "stressed_value": round(stressed_value, 2),
            "threshold": threshold,
            "operator": operator.value,
            "cushion_percent": round(cushion, 2),
            "breach_margin": round(breach_margin, 2),
            "unit": covenant.unit
        }
    
    def simulate_stress_test(
        self,
        db: Session,
        tenant_id: str,
        ebitda_drop_percent: float,
        interest_rate_hike_bps: float
    ) -> Dict[str, Any]:
        """
        Run stress test simulation across all active loans
        
        Returns risk heatmap with breach analysis
        """
        # Get all active loans for tenant
        loans = db.query(Loan).filter(
            Loan.tenant_id == tenant_id,
            Loan.status.in_(["active", "watchlist"])
        ).all()
        
        risk_heatmap = {
            "loans": [],
            "summary": {
                "total_loans": 0,
                "loans_breached": 0,
                "loans_at_risk": 0,
                "loans_safe": 0
            }
        }
        
        for loan in loans:
            # Get all covenants for this loan
            covenants = db.query(Covenant).filter(Covenant.loan_id == loan.id).all()
            
            if not covenants:
                continue
            
            loan_results = {
                "loan_id": loan.id,
                "company_name": loan.company_name,
                "loan_amount": loan.loan_amount,
                "currency": loan.currency,
                "covenants": [],
                "overall_status": "safe",
                "breach_count": 0,
                "at_risk_count": 0
            }
            
            for covenant in covenants:
                if covenant.current_value is None:
                    continue
                
                # Calculate stressed value
                stressed_value = self.calculate_stressed_ratio(
                    current_value=covenant.current_value,
                    ebitda_drop_percent=ebitda_drop_percent,
                    interest_rate_hike_bps=interest_rate_hike_bps,
                    ratio_type=covenant.name.lower()
                )
                
                # Check breach status
                result = self.check_covenant_breach(covenant, stressed_value)
                loan_results["covenants"].append(result)
                
                # Update loan-level status
                if result["status"] == "breach":
                    loan_results["breach_count"] += 1
                    loan_results["overall_status"] = "breach"
                elif result["status"] == "at_risk" and loan_results["overall_status"] != "breach":
                    loan_results["at_risk_count"] += 1
                    loan_results["overall_status"] = "at_risk"
            
            # Update summary
            risk_heatmap["summary"]["total_loans"] += 1
            if loan_results["overall_status"] == "breach":
                risk_heatmap["summary"]["loans_breached"] += 1
            elif loan_results["overall_status"] == "at_risk":
                risk_heatmap["summary"]["loans_at_risk"] += 1
            else:
                risk_heatmap["summary"]["loans_safe"] += 1
            
            risk_heatmap["loans"].append(loan_results)
        
        return risk_heatmap

