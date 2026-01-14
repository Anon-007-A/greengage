# GreenGauge Integration Guide

## Overview

GreenGauge provides standardized APIs and data mapping guides for seamless integration with major financial data providers, loan syndication platforms, and ESG reporting systems. This guide covers integration patterns for the most widely-used fintech platforms.

---

## Table of Contents

1. [Bloomberg Terminal Integration](#bloomberg-terminal-integration)
2. [LSEG/Refinitiv Integration](#lsegrefinitiv-integration)
3. [LMA Covenant Standards](#lma-covenant-standards)
4. [SWIFT Loan Syndication](#swift-loan-syndication)
5. [EU Taxonomy Alignment](#eu-taxonomy-alignment)
6. [Data Format Transformations](#data-format-transformations)
7. [Custom Connector Development](#custom-connector-development)

---

## Bloomberg Terminal Integration

### Overview

Bloomberg provides real-time financial data for 2M+ securities. GreenGauge integrates Bloomberg loan pricing and company fundamental data.

### Data Mapping

```python
# Bloomberg API Response (Sample)
bloomberg_response = {
    "ticker": "GREENCORP CORP/LN",
    "name": "Green Corp PLC",
    "country": "GB",
    "sector": "Utilities",
    "pe_ratio": 12.5,
    "market_cap": 2500000000,  # €2.5B
    "debt_to_equity": 0.65,
    "ebitda_ltm": 400000000,   # €400M
    "yield": 3.75,
    "credit_rating": "BBB+"
}

# GreenGauge Normalized Format
greengauge_loan = {
    "id": "bloomberg-GREENCORP-001",
    "sourceSystem": "Bloomberg",
    "companyName": "Green Corp PLC",
    "sector": "Renewable Energy",
    "country": "GB",

    # Loan Estimation from Market Data
    "estimatedLoanAmount": 1250000000,  # 50% of market cap
    "estimatedInterestRate": 4.75,      # Yield + spread
    "currency": "GBP",

    # Financial Metrics for Covenant Calculation
    "financialMetrics": {
        "marketCap": 2500000000,
        "debtToEquity": 0.65,
        "ebitdaLTM": 400000000,
        "peRatio": 12.5
    },

    # Risk Assessment
    "creditRating": "BBB+",
    "estimatedRiskScore": 45,

    # ESG Data from Bloomberg
    "esgScores": {
        "bloomberg_esg_score": 45.2,  # Bloomberg ESG score (0-100)
        "environmental": 42.1,
        "social": 48.5,
        "governance": 45.0
    },

    "lastUpdate": "2024-12-20T16:00:00Z"
}
```

### Implementation Example

```python
# Bloomberg data sync service
import asyncio
from datetime import datetime

class BloombergConnector:
    """Connector for Bloomberg Terminal API"""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.bloomberg.com/v1"

    async def fetch_company_data(self, ticker: str) -> dict:
        """Fetch company data from Bloomberg"""
        endpoint = f"{self.base_url}/security/{ticker}"
        headers = {"Authorization": f"Bearer {self.api_key}"}

        # In production: use aiohttp for async requests
        # response = await aiohttp.ClientSession().get(endpoint, headers=headers)
        # data = await response.json()

        # Demo response
        return {
            "ticker": ticker,
            "name": "Company Name",
            "ebitda": 400000000,
            "debt": 600000000,
            "esg_score": 45.2
        }

    def normalize_to_greengauge(self, bloomberg_data: dict) -> dict:
        """Transform Bloomberg format to GreenGauge format"""
        return {
            "id": f"bloomberg-{bloomberg_data['ticker']}-001",
            "companyName": bloomberg_data["name"],
            "estimatedLoanAmount": bloomberg_data.get("ebitda", 0) * 2.5,
            "estimatedInterestRate": 4.75,
            "currency": "EUR",
            "creditRating": bloomberg_data.get("rating", "BBB"),
            "esgScores": {
                "bloomberg_esg_score": bloomberg_data.get("esg_score", 0)
            }
        }

    async def sync_portfolio(self, tickers: list) -> list:
        """Sync multiple companies from Bloomberg"""
        tasks = [self.fetch_company_data(ticker) for ticker in tickers]
        results = await asyncio.gather(*tasks)

        return [self.normalize_to_greengauge(data) for data in results]
```

### Bloomberg Integration Checklist

- [ ] Register Bloomberg Terminal API credentials
- [ ] Map Bloomberg covenant definitions to GreenGauge standard
- [ ] Set up daily/weekly data sync
- [ ] Configure alert rules for rating changes
- [ ] Validate ESG data mappings

---

## LSEG/Refinitiv Integration

### Overview

LSEG (London Stock Exchange Group) provides Refinitiv (formerly Thomson Reuters) data covering loans, bonds, and market intelligence.

### Data Mapping

```python
# LSEG/Refinitiv Data Format
refinitiv_loan_data = {
    "loan_id": "LSGN20241220-001",
    "borrower": {
        "name": "SolarGrid Energy",
        "lei": "5493001KJTIIGC8Y1R12",
        "country": "DE",
        "sector": "Energy - Renewable"
    },
    "facility": {
        "amount": 50000000,
        "currency": "EUR",
        "facility_type": "Term Loan",
        "maturity_date": "2028-01-15",
        "pricing": "EURIBOR+3.50%"
    },
    "covenants": [
        {
            "covenant_id": "FC001",
            "covenant_name": "Total Debt / EBITDA",
            "max_threshold": 4.0,
            "testing_frequency": "Quarterly",
            "financial_metrics_type": "Consolidated"
        }
    ],
    "syndication": {
        "arrangers": ["Deutsche Bank", "ING", "Santander"],
        "lenders": ["Nordea", "Commerzbank"],
        "facility_agent": "Deutsche Bank"
    }
}

# GreenGauge Normalized Format
greengauge_from_refinitiv = {
    "id": "lseg-20241220-001",
    "sourceSystem": "LSEG Refinitiv",
    "companyName": "SolarGrid Energy",
    "lei": "5493001KJTIIGC8Y1R12",
    "country": "DE",
    "sector": "Renewable Energy",

    "loanAmount": 50000000,
    "currency": "EUR",
    "facilityType": "Term Loan",
    "maturityDate": "2028-01-15",
    "interestRate": 6.50,  # EURIBOR (3.0%) + Spread (3.50%)

    "covenants": [
        {
            "name": "Total Debt / EBITDA",
            "type": "financial",
            "threshold": 4.0,
            "unit": "x",
            "testingFrequency": "Quarterly",
            "lmaStandardId": "FC-001-DEBT-EBITDA"
        }
    ],

    "syndication": {
        "arrangers": ["Deutsche Bank", "ING", "Santander"],
        "facilityAgent": "Deutsche Bank"
    },

    "lastUpdate": "2024-12-20T16:00:00Z"
}
```

### Implementation Example

```python
class LsegConnector:
    """Connector for LSEG/Refinitiv API"""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.refinitiv.com/loans/v1"

    # Map Refinitiv covenant types to LMA standard
    COVENANT_MAPPING = {
        "Total Debt / EBITDA": "FC-001-DEBT-EBITDA",
        "Interest Coverage": "FC-002-INTEREST-COVERAGE",
        "Current Ratio": "FC-003-CURRENT-RATIO",
        "Leverage Ratio": "FC-004-LEVERAGE-RATIO",
        "DSCR": "FC-005-DSCR",
    }

    def normalize_covenant(self, refinitiv_covenant: dict) -> dict:
        """Convert Refinitiv covenant to GreenGauge format"""
        name = refinitiv_covenant.get("covenant_name", "")
        lma_id = self.COVENANT_MAPPING.get(name, f"CUSTOM-{name}")

        return {
            "name": name,
            "type": self._infer_covenant_type(name),
            "threshold": refinitiv_covenant.get("max_threshold"),
            "lmaStandardId": lma_id,
            "testingFrequency": refinitiv_covenant.get("testing_frequency", "Quarterly")
        }

    def _infer_covenant_type(self, covenant_name: str) -> str:
        """Infer covenant type from name"""
        if "EBITDA" in covenant_name or "Interest" in covenant_name:
            return "financial"
        elif "ESG" in covenant_name or "CO2" in covenant_name:
            return "esg"
        else:
            return "operational"

    def normalize_loan(self, refinitiv_loan: dict) -> dict:
        """Transform Refinitiv loan format to GreenGauge"""
        borrower = refinitiv_loan.get("borrower", {})
        facility = refinitiv_loan.get("facility", {})

        # Extract coupon from pricing string (e.g., "EURIBOR+3.50%")
        pricing = facility.get("pricing", "3.50%")
        spread = float(pricing.split("+")[-1].rstrip("%")) if "+" in pricing else 3.5
        base_rate = 3.0  # Current EURIBOR
        interest_rate = base_rate + spread

        return {
            "id": f"lseg-{refinitiv_loan.get('loan_id')}",
            "sourceSystem": "LSEG Refinitiv",
            "companyName": borrower.get("name"),
            "lei": borrower.get("lei"),
            "country": borrower.get("country"),
            "sector": self._normalize_sector(borrower.get("sector", "")),
            "loanAmount": facility.get("amount"),
            "currency": facility.get("currency", "EUR"),
            "facilityType": facility.get("facility_type"),
            "maturityDate": facility.get("maturity_date"),
            "interestRate": interest_rate,
            "covenants": [
                self.normalize_covenant(cov)
                for cov in refinitiv_loan.get("covenants", [])
            ]
        }

    def _normalize_sector(self, sector_name: str) -> str:
        """Normalize sector name to GreenGauge standard"""
        sector_map = {
            "Energy - Renewable": "Renewable Energy",
            "Utilities": "Renewable Energy",
            "Transportation": "Sustainable Transport",
            "Construction": "Sustainable Construction",
            "Real Estate": "Green Real Estate",
        }
        return sector_map.get(sector_name, sector_name)
```

### LSEG Integration Checklist

- [ ] Set up Refinitiv data license
- [ ] Configure loan syndication feed
- [ ] Map covenant definitions to LMA taxonomy
- [ ] Validate LEI (Legal Entity Identifier) resolution
- [ ] Set up automated data quality checks

---

## LMA Covenant Standards

### Overview

The Loan Market Association (LMA) publishes standardized covenant definitions used globally. GreenGauge uses LMA's taxonomy for interoperability.

### LMA Covenant Taxonomy

```python
# LMA Standard Covenants Reference
LMA_COVENANT_TAXONOMY = {
    # Financial Covenants - Leverage Ratios
    "FC-001-DEBT-EBITDA": {
        "name": "Total Debt / EBITDA",
        "category": "leverage",
        "description": "Total debt (including operating leases) divided by EBITDA",
        "typical_threshold": 4.0,
        "frequency": "Quarterly",
        "testing_basis": "Consolidated",
        "calculation_method": "(Gross Debt) / (EBITDA last 12 months)",
        "breach_consequence": "Technical default, waiver required"
    },

    "FC-002-INTEREST-COVERAGE": {
        "name": "Interest Coverage Ratio",
        "category": "coverage",
        "description": "EBITDA divided by cash interest expense",
        "typical_threshold": 3.0,
        "frequency": "Quarterly",
        "testing_basis": "Consolidated",
        "calculation_method": "(EBITDA last 12 months) / (Cash interest expense)",
        "breach_consequence": "Default if cure not achieved within 30 days"
    },

    "FC-003-LEVERAGE-RATIO": {
        "name": "Leverage Ratio",
        "category": "leverage",
        "description": "Total debt divided by capitalization",
        "typical_threshold": 0.65,
        "frequency": "Quarterly"
    },

    "FC-004-CURRENT-RATIO": {
        "name": "Current Ratio",
        "category": "liquidity",
        "description": "Current assets divided by current liabilities",
        "typical_threshold": 1.2,
        "frequency": "Quarterly"
    },

    "FC-005-DSCR": {
        "name": "Debt Service Coverage Ratio",
        "category": "coverage",
        "description": "Operating cash flow divided by debt service",
        "typical_threshold": 1.25,
        "frequency": "Annual"
    },

    # ESG Covenants (Sustainability-Linked)
    "ESG-001-CO2-TARGET": {
        "name": "CO2 Reduction Target",
        "category": "environmental",
        "description": "Achieve X% reduction in CO2 emissions vs baseline",
        "typical_threshold": 5.0,  # 5% reduction
        "frequency": "Annual",
        "verification": "Third-party verified",
        "breach_consequence": "Pricing step-up (25-50 bps)"
    },

    "ESG-002-ENERGY-EFFICIENCY": {
        "name": "Energy Efficiency Improvement",
        "category": "environmental",
        "description": "Improve energy efficiency by X% annually",
        "typical_threshold": 3.0,  # 3% improvement
        "frequency": "Annual"
    },

    "ESG-003-DIVERSITY": {
        "name": "Board Diversity Target",
        "category": "social",
        "description": "X% women on board of directors",
        "typical_threshold": 30.0,  # 30%
        "frequency": "Annual"
    }
}

# How GreenGauge maps external covenants to LMA standard
class CovenantMapper:
    def __init__(self):
        self.lma_taxonomy = LMA_COVENANT_TAXONOMY

    def map_to_lma_standard(self, external_covenant: dict) -> dict:
        """
        Map external covenant definition to LMA standard.

        Args:
            external_covenant: {
                "name": "Total Debt to EBITDA",
                "threshold": 4.0,
                "frequency": "Quarterly"
            }

        Returns:
            GreenGauge normalized covenant with LMA reference
        """

        # Find matching LMA standard based on covenant name
        for lma_id, lma_def in self.lma_taxonomy.items():
            if self._is_match(external_covenant["name"], lma_def["name"]):
                return {
                    "id": external_covenant.get("id"),
                    "name": lma_def["name"],
                    "type": "financial" if "FC-" in lma_id else "esg",
                    "category": lma_def.get("category"),
                    "currentValue": external_covenant.get("currentValue"),
                    "threshold": external_covenant.get("threshold"),
                    "lmaStandardId": lma_id,
                    "lmaDefinition": lma_def,
                    "frequency": lma_def.get("frequency"),
                    "status": "compliant"
                }

        # If no match found, create custom mapping
        return {
            "id": external_covenant.get("id"),
            "name": external_covenant.get("name"),
            "type": "custom",
            "currentValue": external_covenant.get("currentValue"),
            "threshold": external_covenant.get("threshold"),
            "status": "unmapped",
            "note": "No direct LMA standard found - requires manual review"
        }

    def _is_match(self, external_name: str, lma_name: str) -> bool:
        """Check if covenant names match (fuzzy matching)"""
        external_norm = external_name.lower().replace("/", " ").split()
        lma_norm = lma_name.lower().replace("/", " ").split()

        # Simple overlap matching (in production, use fuzzy matching library)
        overlap = len(set(external_norm) & set(lma_norm))
        return overlap >= 2
```

### LMA Standard Integration Checklist

- [ ] Review loan documentation against LMA covenant taxonomy
- [ ] Classify covenants by LMA standard ID
- [ ] Document non-standard covenants separately
- [ ] Create covenant modification tracking
- [ ] Set up waiver workflow

---

## SWIFT Loan Syndication

### Overview

SWIFT provides messaging standards for loan syndication. GreenGauge integrates with MT300 (Loan Syndication Message) format.

### Data Format

```python
# SWIFT MT300 Loan Syndication Message (Sample)
swift_mt300_structure = {
    # Header
    "header": {
        "application_header": "F",
        "message_type": "MT300",
        "sequence_number": "000000000001",
        "sender": "DEUTSCHBK",
        "receiver": "INGDBEBB"
    },

    # Text Block (Message Content)
    "text": {
        # Field 20: Message Reference
        "20": "20241220000001",

        # Field 30F: Booking Date
        "30F": "20241220",

        # Field 30G: Maturity Date
        "30G": "20280115",

        # Field 32A: Amount, Currency, Value Date
        "32A": "20241220EUR50000000,",  # Amount in EUR

        # Field 37G: Interest Rate
        "37G": "6.50",  # 6.50%

        # Field 40A: Form of Facility
        "40A": "TERM",  # Term Loan

        # Field 40C: Loan Syndication
        "40C": {
            "C": {
                "status": "FACILITY",
                "borrower": "SolarGrid Energy GmbH",
                "borrower_reference": "SG-LOAN-001",
                "agreement_date": "20240115"
            }
        },

        # Field 40E: Conditions
        "40E": [
            {
                "type": "Covenant",
                "condition": "Total Debt / EBITDA <= 4.0x",
                "frequency": "Quarterly"
            }
        ],

        # Field 50F: Borrower
        "50F": "SolarGrid Energy GmbH",

        # Field 52A: Lender Identifier (BIC Code)
        "52A": "DEUTDEDD500",  # Deutsche Bank

        # Field 56A: Facility Agent
        "56A": "DEUTDEDD500"
    }
}

# GreenGauge SWIFT Import Model
from pydantic import BaseModel
from typing import Optional, List

class SwiftMT300Import(BaseModel):
    """Parse and normalize SWIFT MT300 loan messages"""

    message_reference: str
    sender_bic: str
    receiver_bic: str
    booking_date: str

    # Loan Details
    borrower_name: str
    borrower_reference: str
    loan_amount: float
    currency: str
    maturity_date: str
    interest_rate: float
    facility_type: str

    # Syndication
    arrangers: List[str]
    facility_agent_bic: str

    # Covenants
    covenants: List[dict]

    class Config:
        schema_extra = {
            "example": {
                "message_reference": "20241220000001",
                "sender_bic": "DEUTSCHBK",
                "receiver_bic": "INGDBEBB",
                "borrower_name": "SolarGrid Energy GmbH",
                "loan_amount": 50000000,
                "currency": "EUR",
                "interest_rate": 6.50,
                "facility_type": "Term Loan"
            }
        }

class SwiftConnector:
    def parse_mt300(self, raw_mt300: str) -> SwiftMT300Import:
        """
        Parse raw SWIFT MT300 message and convert to GreenGauge format
        """
        # In production: use swift-message-parser library
        # This is simplified for demo
        parsed = {
            "message_reference": self._extract_field("20", raw_mt300),
            "sender_bic": self._extract_header("sender", raw_mt300),
            "receiver_bic": self._extract_header("receiver", raw_mt300),
            "booking_date": self._extract_field("30F", raw_mt300),
            "loan_amount": self._extract_amount("32A", raw_mt300),
            "currency": self._extract_currency("32A", raw_mt300),
            "interest_rate": float(self._extract_field("37G", raw_mt300)),
            "facility_type": self._extract_field("40A", raw_mt300),
            "maturity_date": self._extract_field("30G", raw_mt300),
            "borrower_name": self._extract_field("50F", raw_mt300),
            "facility_agent_bic": self._extract_field("56A", raw_mt300),
            "arrangers": self._extract_syndication("40C", raw_mt300),
            "covenants": self._extract_covenants("40E", raw_mt300)
        }

        return SwiftMT300Import(**parsed)

    def _extract_field(self, field_code: str, mt300: str) -> str:
        """Extract field from MT300"""
        # Simplified extraction (production would use proper parser)
        return ""

    def normalize_to_greengauge(self, swift_import: SwiftMT300Import) -> dict:
        """Convert SWIFT format to GreenGauge"""
        return {
            "id": f"swift-{swift_import.message_reference}",
            "sourceSystem": "SWIFT MT300",
            "companyName": swift_import.borrower_name,
            "loanAmount": swift_import.loan_amount,
            "currency": swift_import.currency,
            "maturityDate": swift_import.maturity_date,
            "interestRate": swift_import.interest_rate,
            "facilityType": swift_import.facility_type,
            "covenants": swift_import.covenants,
            "syndication": {
                "arrangers": swift_import.arrangers,
                "facilityAgent": swift_import.facility_agent_bic
            }
        }
```

---

## EU Taxonomy Alignment

### Overview

EU Taxonomy Classification Regulation (TR 2020/852) requires finance to classify economic activities. GreenGauge auto-maps loans to taxonomy.

### Implementation

```python
# EU Taxonomy Activity Mapping
EU_TAXONOMY_ACTIVITIES = {
    "3.1": {
        "description": "Electricity generation from solar energy",
        "sector": "Renewable Energy",
        "climate_mitigation": True,
        "climate_adaptation": False,
        "template": "Energy"
    },
    "3.2": {
        "description": "Electricity generation from wind energy",
        "sector": "Renewable Energy",
        "climate_mitigation": True,
        "climate_adaptation": False,
        "template": "Energy"
    },
    "6.1": {
        "description": "Rapid transit systems",
        "sector": "Sustainable Transport",
        "climate_mitigation": True,
        "climate_adaptation": False,
        "template": "Transport"
    },
    "7.1": {
        "description": "Acquisition and ownership of buildings",
        "sector": "Green Real Estate",
        "climate_mitigation": True,
        "climate_adaptation": True,
        "template": "Buildings"
    }
}

class EuTaxonomyClassifier:
    """Automatically classify loans against EU Taxonomy"""

    def classify_loan(self, loan: dict) -> dict:
        """Classify a loan against EU Taxonomy"""
        sector = loan.get("sector", "")
        company_activities = loan.get("companyActivities", [])

        taxonomy_matches = []

        for activity_code, activity_def in EU_TAXONOMY_ACTIVITIES.items():
            if self._is_match(sector, company_activities, activity_def):
                taxonomy_matches.append({
                    "code": activity_code,
                    "description": activity_def["description"],
                    "climateContribution": {
                        "mitigation": activity_def["climate_mitigation"],
                        "adaptation": activity_def["climate_adaptation"]
                    },
                    "dnshGuidance": self._get_dnsh_criteria(activity_code),
                    "eligible": True,
                    "aligned": self._assess_alignment(loan, activity_code)
                })

        return {
            "loanId": loan.get("id"),
            "taxonomyEligibility": {
                "eligible": len(taxonomy_matches) > 0,
                "matchedActivities": taxonomy_matches,
                "eligibilityPercent": (len(taxonomy_matches) / 50) * 100  # Out of potential 50
            }
        }

    def _get_dnsh_criteria(self, activity_code: str) -> dict:
        """Get 'Do No Significant Harm' criteria for activity"""
        return {
            "climateChange": {
                "adaptation": True,
                "mitigation": True
            },
            "waterAndMarinResources": True,
            "circularEconomy": True,
            "pollution": True,
            "biodiversity": True
        }

    def _assess_alignment(self, loan: dict, activity_code: str) -> bool:
        """Assess if loan meets alignment criteria"""
        # Check ESG targets, supplier standards, etc.
        esg_metrics = loan.get("esgMetrics", [])

        # Must have verified ESG metrics to be aligned
        verified_count = sum(1 for m in esg_metrics if m.get("verificationStatus") == "verified")

        return verified_count >= 2

    def generate_taxonomy_report(self, loans: List[dict]) -> dict:
        """Generate portfolio-level EU Taxonomy report"""
        total_exposure = sum(l.get("loanAmount", 0) for l in loans)

        classifications = [self.classify_loan(l) for l in loans]
        eligible_exposure = sum(
            l.get("loanAmount", 0) for l in loans
            if any(c["eligible"] for c in self.classify_loan(l).get("taxonomyEligibility", {}).get("matchedActivities", []))
        )
        aligned_exposure = sum(
            l.get("loanAmount", 0) for l in loans
            if any(c["aligned"] for c in self.classify_loan(l).get("taxonomyEligibility", {}).get("matchedActivities", []))
        )

        return {
            "reportDate": "2024-12-20",
            "portfolioExposure": total_exposure,
            "taxonomyEligible": {
                "amount": eligible_exposure,
                "percent": (eligible_exposure / total_exposure * 100) if total_exposure > 0 else 0
            },
            "taxonomyAligned": {
                "amount": aligned_exposure,
                "percent": (aligned_exposure / total_exposure * 100) if total_exposure > 0 else 0
            },
            "byActivity": self._aggregate_by_activity(classifications)
        }

    def _aggregate_by_activity(self, classifications: List[dict]) -> dict:
        """Aggregate exposure by taxonomy activity"""
        aggregates = {}
        # Implementation to aggregate by activity code
        return aggregates
```

---

## Data Format Transformations

### CSV Import Template

```csv
company_name,sector,loan_amount,currency,origination_date,maturity_date,interest_rate,covenant_name,covenant_threshold,esg_metric,esg_target
SolarGrid Energy,Renewable Energy,50000000,EUR,2023-01-15,2028-01-15,3.50,Debt-to-EBITDA,4.0,CO2 Reduction,5%
GreenBuild Construction,Sustainable Construction,35000000,EUR,2023-03-20,2028-03-20,4.25,Interest Coverage,3.0,Energy Efficiency,3%
```

### JSON Import Template

```json
{
  "imports": [
    {
      "companyName": "SolarGrid Energy",
      "sector": "Renewable Energy",
      "loanAmount": 50000000,
      "currency": "EUR",
      "originationDate": "2023-01-15",
      "maturityDate": "2028-01-15",
      "interestRate": 3.5,
      "covenants": [
        {
          "name": "Debt-to-EBITDA",
          "threshold": 4.0,
          "currentValue": 2.8
        }
      ],
      "esgMetrics": [
        {
          "name": "CO2 Reduction",
          "target": 50000,
          "current": 45000,
          "unit": "tonnes/year"
        }
      ]
    }
  ]
}
```

---

## Custom Connector Development

### Creating a Custom Connector

```python
from abc import ABC, abstractmethod
from typing import List, Dict, Any

class BaseConnector(ABC):
    """Base class for custom data connectors"""

    @abstractmethod
    def fetch_loans(self) -> List[Dict[str, Any]]:
        """Fetch loan data from external system"""
        pass

    @abstractmethod
    def normalize_to_greengauge(self, external_data: Dict) -> Dict:
        """Transform external format to GreenGauge format"""
        pass

    def validate_data(self, normalized_data: Dict) -> bool:
        """Validate normalized data structure"""
        required_fields = [
            "companyName", "loanAmount", "currency",
            "sector", "covenants", "esgMetrics"
        ]
        return all(field in normalized_data for field in required_fields)

class CustomDataSourceConnector(BaseConnector):
    """Example implementation for custom data source"""

    def __init__(self, api_endpoint: str, api_key: str):
        self.api_endpoint = api_endpoint
        self.api_key = api_key

    def fetch_loans(self) -> List[Dict[str, Any]]:
        """Fetch loans from custom API"""
        # Implement your API call logic
        pass

    def normalize_to_greengauge(self, external_data: Dict) -> Dict:
        """Map your data format to GreenGauge"""
        return {
            "id": external_data.get("id"),
            "companyName": external_data.get("borrower_name"),
            "sector": self._normalize_sector(external_data.get("industry")),
            "loanAmount": external_data.get("principal_amount"),
            "currency": "EUR",
            # ... map other fields
        }

    def _normalize_sector(self, industry: str) -> str:
        """Map custom industry codes to GreenGauge sectors"""
        sector_map = {
            "IND001": "Renewable Energy",
            "IND002": "Sustainable Transport",
            # ... add your mappings
        }
        return sector_map.get(industry, "Other")
```

---

## Support & Best Practices

### Integration Checklist

- [ ] Validate all data mappings against source system documentation
- [ ] Test with sample data before production deployment
- [ ] Implement error handling and logging
- [ ] Set up automated data quality monitoring
- [ ] Document any custom transformation logic
- [ ] Plan for fallback strategies if integration fails
- [ ] Schedule regular data reconciliation audits

### Contact Support

- **Integration Support**: integrations@greengauge.io
- **Technical Documentation**: https://docs.greengauge.io
- **Integration Status**: https://status.greengauge.io

---

**Last Updated**: January 2025  
**Version**: 1.0  
**Next Review**: Q2 2025
