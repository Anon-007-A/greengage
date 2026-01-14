"""
Realistic Mock Data Generator for GreenGauge
Generates 100+ diverse loan records with ESG metrics and covenant data
"""
from datetime import datetime, timedelta
import random
from typing import List, Dict, Any

# European companies across green sectors
COMPANIES = {
    "Renewable Energy": [
        "SolarGrid Energy GmbH", "WindPower Nordic AS", "BioGen Consulting Ltd", "HydroFlow Technologies",
        "SunTrack Deutschland", "Vestas Green Solutions", "RWE Renewables España", "Ørsted Energy Nordic",
        "NextEra Renewable Europe", "EDF Énergies Nouvelles", "E.ON Climate & Renewables", "Iberdrola Renovables"
    ],
    "Sustainable Transport": [
        "ChargeHub Europe BV", "ElectroMobility Solutions GmbH", "Green Rail Systems Ltd", 
        "Urban Transit Innovations", "FlexBus Technology", "Zero Emission Logistics", "GreenShip Scandinavia"
    ],
    "Circular Economy": [
        "RecycleOps Technologies", "CircularHub Manufacturing", "WasteLess Solutions Ltd",
        "Eco-Materials Consortium", "GreenCycle Innovations", "Repair & Reuse Systems"
    ],
    "Green Real Estate": [
        "EcoLiving Properties", "GreenBlock Development", "Sustainable Spaces Ltd",
        "Smart Building Systems", "EnergyEfficient Homes Corp"
    ],
    "Water Management": [
        "AquaClean Technologies", "WaterRecycle Systems", "Desalination Pro", "Watershed Solutions"
    ],
    "Agriculture & Food": [
        "OrganoGrow Systems", "Precision Agriculture Tech", "Sustainable Seafood Co", "GreenFarm Innovations"
    ]
}

COVENANT_TYPES = [
    {"name": "Debt-to-EBITDA", "unit": "x", "typical_threshold": 4.0, "type": "financial"},
    {"name": "Interest Coverage", "unit": "x", "typical_threshold": 3.0, "type": "financial"},
    {"name": "Leverage Ratio", "unit": "x", "typical_threshold": 3.5, "type": "financial"},
    {"name": "Current Ratio", "unit": "x", "typical_threshold": 1.2, "type": "financial"},
    {"name": "DSCR (Debt Service Coverage)", "unit": "x", "typical_threshold": 1.25, "type": "financial"},
    {"name": "EBITDA Minimum", "unit": "€M", "typical_threshold": 10.0, "type": "financial"},
    {"name": "CO2 Reduction Target", "unit": "%", "typical_threshold": 5.0, "type": "esg"},
    {"name": "Energy Efficiency Improvement", "unit": "%", "typical_threshold": 3.0, "type": "esg"},
]

ESG_METRICS = [
    {"name": "CO2 Emissions Reduced", "category": "environmental", "unit": "tonnes/year"},
    {"name": "Renewable Energy Generated", "category": "environmental", "unit": "GWh/year"},
    {"name": "Water Consumed", "category": "environmental", "unit": "million m³"},
    {"name": "Waste Diverted from Landfill", "category": "environmental", "unit": "%"},
    {"name": "Women in Leadership", "category": "social", "unit": "%"},
    {"name": "Community Engagement Hours", "category": "social", "unit": "hours"},
    {"name": "Employee Training Hours", "category": "social", "unit": "hours/employee"},
    {"name": "Governance Score", "category": "governance", "unit": "score (0-100)"},
]


def generate_covenant_status(target_loan_risk: str = "low"):
    """Generate covenant status biased by the loan-level risk bucket.

    target_loan_risk: 'low' | 'high' | 'critical'
    - low: most covenants compliant
    - high: several covenants at_risk
    - critical: at least one breached covenant
    """
    rand = random.random()
    if target_loan_risk == "low":
        # Mostly compliant, small chance of at_risk
        if rand < 0.85:
            return "compliant"
        elif rand < 0.98:
            return "at_risk"
        else:
            return "breached"
    elif target_loan_risk == "high":
        # Higher chance of at_risk, small chance breached
        if rand < 0.15:
            return "compliant"
        elif rand < 0.85:
            return "at_risk"
        else:
            return "breached"
    else:
        # critical: ensure at least one breached
        if rand < 0.1:
            return "compliant"
        elif rand < 0.35:
            return "at_risk"
        else:
            return "breached"


def generate_trend(current_value: float, periods: int = 3, direction: str = "stable") -> List[float]:
    """Generate multi-month trend data. direction can be 'improving', 'stable', 'declining'."""
    trend = []
    value = current_value
    for i in range(periods):
        if direction == "improving":
            value = value * (1 - random.uniform(0.01, 0.05))
        elif direction == "declining":
            value = value * (1 + random.uniform(0.02, 0.12))
        else:
            value = value * (1 + random.uniform(-0.03, 0.03))
        trend.append(round(value, 2))
    return trend


def generate_covenant_data(covenant_type: Dict, target_loan_risk: str = "low") -> Dict[str, Any]:
    """Generate individual covenant record with variance and trend influenced by loan risk."""
    threshold = covenant_type["typical_threshold"]
    status = generate_covenant_status(target_loan_risk)

    # Apply requested variance patterns for breaches and at-risk values
    if status == "compliant":
        multiplier = random.uniform(0.6, 0.95)
    elif status == "at_risk":
        multiplier = random.choice([0.92, 1.08, 1.12]) if covenant_type["unit"] != "%" else random.uniform(0.95, 1.12)
    else:
        # breached - include specified variance samples
        multiplier = random.choice([0.85, 0.92, 1.05, 1.12])

    current = threshold * multiplier

    # For percentage units (ESG), clip sensibly
    cushion = max(0, ((threshold - current) / threshold) * 100) if current < threshold else 0
    days_to_breach = None
    if status in ["at_risk", "breached"]:
        days_to_breach = random.randint(15, 180)

    # Trend direction: make at-risk and breached show declining covenant health
    if status == "breached" or status == "at_risk":
        direction = "declining"
    else:
        direction = random.choice(["stable", "improving"])

    return {
        "name": covenant_type["name"],
        "type": covenant_type["type"],
        "currentValue": round(current, 2),
        "threshold": threshold,
        "unit": covenant_type["unit"],
        "status": status,
        "cushionPercent": round(cushion, 1),
        "daysToBreachEstimate": days_to_breach,
        "trend": generate_trend(current, periods=3, direction=direction),
        "lastUpdated": (datetime.now() - timedelta(days=random.randint(0, 7))).isoformat()
    }


def generate_esg_metrics() -> List[Dict[str, Any]]:
    """Generate ESG metrics for a loan"""
    metrics = []
    selected_metrics = random.sample(ESG_METRICS, k=random.randint(2, 4))
    
    for metric in selected_metrics:
        # ESG scores should be realistic but not perfect
        target = random.randint(50, 200)
        current = round(target * random.uniform(0.65, 1.05), 1)
        progress = min(100, (current / target) * 100)
        
        metrics.append({
            "name": metric["name"],
            "category": metric["category"],
            "currentValue": current,
            "targetValue": target,
            "unit": metric["unit"],
            "progressPercent": round(progress, 1),
            "verificationStatus": random.choice(["verified", "pending", "under_review"]),
            "submissionHistory": [
                {
                    "month": (datetime.now() - timedelta(days=60)).strftime("%b %Y"),
                    "value": round(current * random.uniform(0.85, 0.95), 1),
                    "verified": random.choice([True, True, False])
                },
                {
                    "month": (datetime.now() - timedelta(days=30)).strftime("%b %Y"),
                    "value": round(current * random.uniform(0.92, 1.0), 1),
                    "verified": random.choice([True, True, False])
                },
                {
                    "month": datetime.now().strftime("%b %Y"),
                    "value": current,
                    "verified": True
                }
            ],
            "lastUpdated": (datetime.now() - timedelta(days=random.randint(0, 3))).isoformat()
        })
    
    return metrics


def generate_loans(count: int = 150, distribution: Dict[str, int] = None) -> List[Dict[str, Any]]:
    """Generate realistic loan portfolio with controlled risk distribution.

    distribution: dict with keys 'low','high','critical' (counts or percentages)
    If percentages supplied (sum to 100), they will be converted to counts.
    """
    loans = []
    start_date = datetime(2020, 1, 1)

    # Default distribution 70% low, 20% high, 10% critical
    if distribution is None:
        distribution = {"low": 70, "high": 20, "critical": 10}

    # Convert percentages to counts if sum == 100
    total = count
    if sum(distribution.values()) == 100:
        counts = {k: max(1, round(v * total / 100)) for k, v in distribution.items()}
    else:
        counts = distribution

    # Build risk buckets list
    risk_buckets = []
    for level, c in counts.items():
        risk_buckets += [level] * c
    # Adjust length
    if len(risk_buckets) < total:
        risk_buckets += ["low"] * (total - len(risk_buckets))
    risk_buckets = risk_buckets[:total]
    random.shuffle(risk_buckets)

    for i in range(total):
        sector = random.choice(list(COMPANIES.keys()))
        company_name = random.choice(COMPANIES[sector])
        loan_amount = random.choice([15, 25, 35, 50, 75, 100, 150]) * 1_000_000
        origination_date = start_date + timedelta(days=random.randint(0, 1500))

        target_risk = risk_buckets[i]

        covenants = []
        num_covenants = random.randint(3, 6)
        selected_covenants = random.sample(COVENANT_TYPES, k=num_covenants)

        for cov_type in selected_covenants:
            covenants.append(generate_covenant_data(cov_type, target_loan_risk=target_risk))

        esg_metrics = generate_esg_metrics()

        # Ensure risk_score matches target_risk
        if target_risk == "critical":
            risk_score = random.randint(75, 95)
            level = "critical"
        elif target_risk == "high":
            risk_score = random.randint(50, 74)
            level = "high"
        else:
            risk_score = random.randint(15, 40)
            level = "low"

        loan = {
            "id": f"loan-{i+1:03d}",
            "companyName": company_name,
            "sector": sector,
            "loanAmount": loan_amount,
            "currency": "EUR",
            "originationDate": origination_date.strftime("%Y-%m-%d"),
            "maturityDate": (origination_date + timedelta(days=random.randint(1095, 2190))).strftime("%Y-%m-%d"),
            "interestRate": round(random.uniform(2.5, 5.5), 2),
            "status": "active",
            "relationshipManager": random.choice(["Johan Schmidt", "Marie Dubois", "Anna Rossi", "Klaus Weber", "Elena García"]),
            "lastReviewDate": (datetime.now() - timedelta(days=random.randint(0, 30))).strftime("%Y-%m-%d"),
            "covenants": covenants,
            "esgMetrics": esg_metrics,
            "riskScore": {
                "overall": risk_score,
                "covenantComponent": max(0, risk_score - random.randint(5, 15)),
                "impactComponent": max(0, risk_score - random.randint(5, 20)),
                "level": level,
                "trend": random.choice(["improving", "stable", "deteriorating"]),
                "recommendations": [
                    "Monitor quarterly financial results",
                    "Review ESG progress against targets",
                    "Consider covenant waiver if needed"
                ][:random.randint(1, 3)],
                "lastCalculated": datetime.now().strftime("%Y-%m-%d")
            }
        }

        loans.append(loan)

    return loans


def get_portfolio_summary(loans: List[Dict]) -> Dict[str, Any]:
    """Calculate portfolio-level metrics"""
    total_amount = sum(l["loanAmount"] for l in loans)
    by_sector = {}
    risk_distribution = {"low": 0, "high": 0, "critical": 0}
    
    for loan in loans:
        sector = loan["sector"]
        by_sector[sector] = by_sector.get(sector, 0) + loan["loanAmount"]
        risk_distribution[loan["riskScore"]["level"]] += 1
    
    avg_risk_score = sum(l["riskScore"]["overall"] for l in loans) / len(loans)
    
    return {
        "totalAmount": total_amount,
        "portfolioCount": len(loans),
        "bySector": by_sector,
        "riskDistribution": risk_distribution,
        "averageRiskScore": round(avg_risk_score, 1),
        "lastUpdated": datetime.now().isoformat()
    }


if __name__ == "__main__":
    loans = generate_loans(100)
    summary = get_portfolio_summary(loans)
    print(f"Generated {len(loans)} loans")
    print(f"Portfolio Summary: {summary}")
