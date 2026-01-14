# GreenGauge Data Standardization & Interoperability

## Executive Summary

GreenGauge implements a standardized data model that normalizes loan and ESG data from diverse sources (Bloomberg, LSEG, LMA, SWIFT) into a unified format. This enables seamless interoperability with financial institutions, regulators, and third-party platforms.

---

## Table of Contents

1. [Standardization Architecture](#standardization-architecture)
2. [Covenant Taxonomy Normalization](#covenant-taxonomy-normalization)
3. [ESG Data Normalization](#esg-data-normalization)
4. [Interoperability Patterns](#interoperability-patterns)
5. [Data Quality Standards](#data-quality-standards)
6. [Compliance Mappings](#compliance-mappings)

---

## Standardization Architecture

### Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   External Data Sources                      │
│  (Bloomberg, LSEG, SWIFT, Bank Systems, CSVs, Spreadsheets)│
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│         GreenGauge Normalization & Transformation Layer      │
│  • Data mapping (source → standard)                          │
│  • Validation & error handling                              │
│  • Covenant type standardization                            │
│  • ESG metric aggregation                                   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│         GreenGauge Unified Data Model (CDM)                 │
│  • Standard Loan Object                                     │
│  • Standard Covenant Object                                 │
│  • Standard ESG Metric Object                               │
│  • Standard Portfolio Object                                │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              GreenGauge Output Formats                        │
│  • REST API (JSON)                                          │
│  • Database (PostgreSQL)                                    │
│  • Reporting (PDF, Excel)                                   │
│  • Integration APIs (third-party systems)                   │
└─────────────────────────────────────────────────────────────┘
```

### Standard Data Objects

```python
# GreenGauge Common Data Model (CDM)

class StandardLoan:
    """Normalized loan object"""
    id: str                          # Unique identifier
    sourceSystem: str                # Data source (Bloomberg, LSEG, etc.)
    externalId: str                  # ID in source system

    # Borrower Information
    companyName: str
    lei: Optional[str]               # Legal Entity Identifier (ISO 17442)
    country: str                     # ISO 3166-1 alpha-2
    sector: str                      # GreenGauge standard sector

    # Loan Terms
    loanAmount: float                # Amount in specified currency
    currency: str                    # ISO 4217
    originationDate: date
    maturityDate: date
    interestRate: float              # Percentage

    # Standard References
    facilityId: str                  # Facility identifier
    borrowerReference: str           # Borrower's internal reference

    # Normalized Collections
    covenants: List[StandardCovenant]
    esgMetrics: List[StandardEsgMetric]

    # Metadata
    dataQualityScore: float          # 0.0-1.0
    lastUpdated: datetime
    nextReviewDate: datetime


class StandardCovenant:
    """Normalized covenant object"""
    id: str                          # Unique covenant ID
    loanId: str

    # Covenant Definition
    name: str                        # Standard covenant name
    type: str                        # financial | operational | esg
    category: str                    # leverage | coverage | liquidity | environmental

    # Covenant Terms
    currentValue: float              # Latest value
    threshold: float                 # Breach threshold
    unit: str                        # x, %, €, etc.
    operator: str                    # < | <= | > | >= | =

    # LMA Standard Reference
    lmaStandardId: str              # e.g., "FC-001-DEBT-EBITDA"

    # Status & Trends
    status: str                      # compliant | at_risk | breached
    cushionPercent: float            # Distance from threshold
    daysToBreachEstimate: Optional[int]
    trend: List[float]               # Historical 3-month values

    # Metadata
    testingFrequency: str            # Quarterly | Semi-Annual | Annual
    lastReportingDate: date
    verificationStatus: str          # verified | unverified


class StandardEsgMetric:
    """Normalized ESG metric object"""
    id: str
    loanId: str

    # Metric Definition
    name: str                        # Standard ESG metric name
    category: str                    # environmental | social | governance

    # Metric Values
    currentValue: float              # Latest reported value
    targetValue: float               # ESG target/commitment
    unit: str                        # tonnes, %, MWh, etc.
    progressPercent: float           # 0-100% toward target

    # Verification
    verificationStatus: str          # verified | pending | under_review
    verifier: Optional[str]          # Third-party verifier (e.g., TUV)

    # History
    submissionHistory: List[{
        "month": str,                # "Jan 2024"
        "value": float,
        "verified": bool
    }]

    # Metadata
    reportingStandard: str           # GRI | SASB | TCFD | etc.
    lastUpdated: datetime
```

---

## Covenant Taxonomy Normalization

### Problem: Covenant Diversity

Different lenders, jurisdictions, and loan types use different covenant terminology:

```
Internal Bank Definitions          → GreenGauge Standard
──────────────────────────────────────────────────────
"Net Debt / EBITDA"                → "Debt-to-EBITDA" (FC-001)
"DSCR - Debt Service Coverage"     → "DSCR" (FC-005)
"Interest Earning Capacity"        → "Interest Coverage" (FC-002)
"Loan to Value"                    → "LTV Ratio" (FC-006)
"Green KPI Achievement"            → "ESG Target Achievement" (ESG-001)
```

### Solution: LMA Standard Reference

```python
# Covenant Normalization Process

class CovenantNormalizer:
    """Transform diverse covenant definitions to LMA standard"""

    # GreenGauge ↔ LMA Standard Mapping
    COVENANT_MAPPING = {
        "FC-001-DEBT-EBITDA": {
            "name": "Debt-to-EBITDA",
            "aliases": [
                "Net Debt / EBITDA",
                "Total Debt / EBITDA",
                "Leverage Ratio (Net Debt)",
                "NDTL / EBITDA"
            ],
            "calculation": "(Total Debt) / (EBITDA LTM)",
            "typical_threshold": 4.0,
            "unit": "x",
            "frequency": "Quarterly",
            "lma_reference": "LMA Syndicated Loans Code 2018"
        },

        "FC-002-INTEREST-COVERAGE": {
            "name": "Interest Coverage Ratio",
            "aliases": [
                "Interest Earning Capacity",
                "EBITDA / Interest Expense",
                "Interest Times Covered"
            ],
            "calculation": "(EBITDA LTM) / (Cash Interest Paid)",
            "typical_threshold": 3.0,
            "unit": "x",
            "frequency": "Quarterly"
        },

        "FC-005-DSCR": {
            "name": "DSCR (Debt Service Coverage Ratio)",
            "aliases": [
                "Debt Service Coverage",
                "Operating Cash Flow / Debt Service"
            ],
            "calculation": "(Operating Cash Flow) / (Principal + Interest Paid)",
            "typical_threshold": 1.25,
            "unit": "x",
            "frequency": "Annual"
        },

        "ESG-001-CO2": {
            "name": "CO2 Emissions Reduction",
            "aliases": [
                "Carbon Footprint Reduction",
                "GHG Emissions Target",
                "Scope 1-2 Emissions Reduction"
            ],
            "calculation": "(Baseline CO2 - Current CO2) / Baseline CO2",
            "typical_threshold": 5.0,
            "unit": "%",
            "frequency": "Annual",
            "verification_required": True,
            "reporting_standard": "GRI"
        }
    }

    def normalize_covenant(self, external_covenant: dict) -> StandardCovenant:
        """
        Transform covenant from any source format to standard format

        Args:
            external_covenant: Covenant from Bloomberg/LSEG/bank system

        Returns:
            StandardCovenant object with LMA reference
        """

        # Step 1: Identify covenant type (fuzzy matching)
        covenant_name = external_covenant.get("name", "")
        lma_match = self._find_lma_match(covenant_name)

        if not lma_match:
            lma_match = self._classify_custom_covenant(covenant_name)

        # Step 2: Extract and normalize values
        current_value = external_covenant.get("currentValue")
        threshold = external_covenant.get("threshold")

        # Step 3: Determine status
        status = self._determine_status(
            current_value,
            threshold,
            external_covenant.get("operator", "<")
        )

        # Step 4: Build standard object
        return StandardCovenant(
            id=f"cov-{self._generate_id()}",
            loanId=external_covenant.get("loanId"),
            name=lma_match["name"],
            type=self._infer_type(lma_match),
            category=lma_match.get("category"),
            currentValue=current_value,
            threshold=threshold,
            unit=lma_match.get("unit"),
            lmaStandardId=lma_match.get("lma_id"),
            status=status,
            testingFrequency=lma_match.get("frequency"),
            verificationStatus="verified" if lma_match.get("verification_required") else "unverified"
        )

    def _find_lma_match(self, covenant_name: str) -> Optional[dict]:
        """Find matching LMA standard by name similarity"""

        for lma_id, definition in self.COVENANT_MAPPING.items():
            # Check exact match
            if covenant_name == definition["name"]:
                return {**definition, "lma_id": lma_id}

            # Check aliases
            for alias in definition.get("aliases", []):
                if covenant_name.lower() == alias.lower():
                    return {**definition, "lma_id": lma_id}

        return None

    def _classify_custom_covenant(self, covenant_name: str) -> dict:
        """Classify non-standard covenant"""

        covenant_lower = covenant_name.lower()

        if "debt" in covenant_lower and "ebitda" in covenant_lower:
            return {
                "name": "Debt-to-EBITDA (Custom)",
                "lma_id": "FC-001-DEBT-EBITDA",
                "category": "leverage",
                "unit": "x",
                "frequency": "Quarterly",
                "confidence": 0.8,
                "note": "Classified based on keyword matching"
            }
        elif "interest" in covenant_lower and ("coverage" in covenant_lower or "earning" in covenant_lower):
            return {
                "name": "Interest Coverage (Custom)",
                "lma_id": "FC-002-INTEREST-COVERAGE",
                "category": "coverage",
                "unit": "x",
                "frequency": "Quarterly",
                "confidence": 0.7
            }
        else:
            return {
                "name": "Custom Covenant (Unmapped)",
                "lma_id": "CUSTOM-UNMAPPED",
                "category": "custom",
                "unit": "unknown",
                "frequency": "Unknown",
                "confidence": 0.0,
                "requires_manual_review": True
            }

# Example Usage
normalizer = CovenantNormalizer()

# From Bloomberg
bloomberg_covenant = {
    "name": "Net Debt / EBITDA",
    "currentValue": 2.8,
    "threshold": 4.0,
    "operator": "<",
    "loanId": "loan-001"
}
normalized = normalizer.normalize_covenant(bloomberg_covenant)
# Result: StandardCovenant with lmaStandardId="FC-001-DEBT-EBITDA"

# From LSEG (slightly different naming)
lseg_covenant = {
    "name": "Total Debt to EBITDA",
    "currentValue": 2.8,
    "threshold": 4.0,
    "loanId": "loan-001"
}
normalized = normalizer.normalize_covenant(lseg_covenant)
# Result: StandardCovenant with lmaStandardId="FC-001-DEBT-EBITDA" (same as above!)
```

---

## ESG Data Normalization

### Problem: ESG Metric Fragmentation

ESG metrics reported using different standards (GRI, SASB, TCFD, EU Taxonomy):

```
GRI Reporting              SASB Metrics           TCFD Reporting
───────────────────────────────────────────────────────────
Scope 1 CO2 Emissions → Carbon Emissions → Governance Risk
Employee Engagement  → Labor Practices  → Social Risk
Supply Chain Audits  → Supplier Mgmt    → Governance Risk
```

### Solution: Normalization to Standard Categories

```python
class EsgNormalizer:
    """Transform ESG data from various standards to unified format"""

    # GreenGauge Standard ESG Categories
    STANDARD_CATEGORIES = {
        "ENVIRONMENTAL": [
            "CO2 Emissions Reduction",
            "Renewable Energy Generation",
            "Water Consumption",
            "Waste Diversion",
            "Energy Efficiency",
            "Biodiversity Impact"
        ],
        "SOCIAL": [
            "Women in Leadership",
            "Employee Training Hours",
            "Community Engagement",
            "Health & Safety Record",
            "Diversity & Inclusion",
            "Supply Chain Labor Standards"
        ],
        "GOVERNANCE": [
            "Board Independence",
            "Executive Compensation",
            "Corruption & Bribery Prevention",
            "Data Privacy & Security",
            "Stakeholder Engagement",
            "ESG Committee Oversight"
        ]
    }

    # Mapping from standard reporting formats
    STANDARD_MAPPINGS = {
        "GRI": {
            "GRI 305-1": {
                "metric": "Scope 1 GHG Emissions",
                "greengauge_metric": "CO2 Emissions Reduction",
                "greengauge_category": "ENVIRONMENTAL"
            },
            "GRI 306-3": {
                "metric": "Waste Diverted from Disposal",
                "greengauge_metric": "Waste Diversion",
                "greengauge_category": "ENVIRONMENTAL"
            },
            "GRI 401-1": {
                "metric": "Employee New Hires",
                "greengauge_metric": "Employee Retention",
                "greengauge_category": "SOCIAL"
            },
            "GRI 405-1": {
                "metric": "Diversity of Governance Bodies",
                "greengauge_metric": "Women in Leadership",
                "greengauge_category": "SOCIAL"
            }
        },

        "SASB": {
            "EN-CO-130a.1": {
                "metric": "Greenhouse Gas Emissions",
                "greengauge_metric": "CO2 Emissions Reduction",
                "greengauge_category": "ENVIRONMENTAL"
            },
            "HR-MN-330a.1": {
                "metric": "Percentage of Workforce Unionized",
                "greengauge_metric": "Supply Chain Labor Standards",
                "greengauge_category": "SOCIAL"
            },
            "GV-MH-510a.1": {
                "metric": "Board Independence",
                "greengauge_metric": "Board Independence",
                "greengauge_category": "GOVERNANCE"
            }
        },

        "TCFD": {
            "E": {
                "metric": "Governance - Climate Risk Oversight",
                "greengauge_metric": "CO2 Emissions Reduction",
                "greengauge_category": "ENVIRONMENTAL"
            },
            "S": {
                "metric": "Management - Climate Risk Strategy",
                "greengauge_metric": "Stakeholder Engagement",
                "greengauge_category": "SOCIAL"
            },
            "G": {
                "metric": "Risk Management - Climate Risk Integration",
                "greengauge_metric": "ESG Committee Oversight",
                "greengauge_category": "GOVERNANCE"
            }
        }
    }

    def normalize_esg_metric(self, external_metric: dict, standard: str) -> StandardEsgMetric:
        """
        Transform ESG metric from any reporting standard to GreenGauge format

        Args:
            external_metric: ESG metric in source format
            standard: Source standard ("GRI", "SASB", "TCFD", etc.)

        Returns:
            StandardEsgMetric object
        """

        # Step 1: Find mapping
        standard_mappings = self.STANDARD_MAPPINGS.get(standard, {})
        metric_id = external_metric.get("id")
        mapping = standard_mappings.get(metric_id)

        if not mapping:
            # Fallback: classify by name similarity
            mapping = self._classify_custom_metric(
                external_metric.get("name"),
                standard
            )

        # Step 2: Extract values
        current_value = external_metric.get("currentValue", 0)
        target_value = external_metric.get("targetValue")
        unit = external_metric.get("unit", "")

        # Calculate progress
        progress = 0
        if target_value and target_value > 0:
            progress = min(100, (current_value / target_value) * 100)

        # Step 3: Build standard object
        return StandardEsgMetric(
            id=f"esg-{self._generate_id()}",
            loanId=external_metric.get("loanId"),
            name=mapping["greengauge_metric"],
            category=mapping["greengauge_category"].lower(),
            currentValue=current_value,
            targetValue=target_value or current_value,
            unit=unit,
            progressPercent=progress,
            verificationStatus=external_metric.get("verificationStatus", "pending"),
            verifier=external_metric.get("verifier"),
            reportingStandard=standard,
            submissionHistory=external_metric.get("history", [])
        )

    def normalize_portfolio_esg(self, portfolio: List[dict], standard: str) -> dict:
        """Aggregate ESG metrics across portfolio"""

        all_metrics = []

        for loan in portfolio:
            loan_metrics = loan.get("esgMetrics", [])
            for metric in loan_metrics:
                normalized = self.normalize_esg_metric(metric, standard)
                all_metrics.append(normalized)

        # Aggregate by category
        by_category = {"environmental": [], "social": [], "governance": []}

        for metric in all_metrics:
            by_category[metric.category].append(metric)

        return {
            "totalMetrics": len(all_metrics),
            "byCategory": {
                "environmental": {
                    "count": len(by_category["environmental"]),
                    "averageProgress": self._avg_progress(by_category["environmental"]),
                    "verifiedCount": sum(
                        1 for m in by_category["environmental"]
                        if m.verificationStatus == "verified"
                    )
                },
                "social": {
                    "count": len(by_category["social"]),
                    "averageProgress": self._avg_progress(by_category["social"]),
                    "verifiedCount": sum(
                        1 for m in by_category["social"]
                        if m.verificationStatus == "verified"
                    )
                },
                "governance": {
                    "count": len(by_category["governance"]),
                    "averageProgress": self._avg_progress(by_category["governance"]),
                    "verifiedCount": sum(
                        1 for m in by_category["governance"]
                        if m.verificationStatus == "verified"
                    )
                }
            }
        }

    def _avg_progress(self, metrics: list) -> float:
        """Calculate average progress"""
        if not metrics:
            return 0
        return sum(m.progressPercent for m in metrics) / len(metrics)

# Example Usage
esg_normalizer = EsgNormalizer()

# From GRI reporting
gri_metric = {
    "id": "GRI 305-1",
    "name": "Scope 1 GHG Emissions",
    "currentValue": 45000,
    "targetValue": 50000,
    "unit": "tonnes CO2e",
    "verificationStatus": "verified",
    "loanId": "loan-001"
}
normalized = esg_normalizer.normalize_esg_metric(gri_metric, "GRI")
# Result: StandardEsgMetric with name="CO2 Emissions Reduction", category="environmental"

# From SASB reporting
sasb_metric = {
    "id": "EN-CO-130a.1",
    "name": "Greenhouse Gas Emissions",
    "currentValue": 45000,
    "targetValue": 50000,
    "unit": "tonnes CO2e",
    "loanId": "loan-001"
}
normalized = esg_normalizer.normalize_esg_metric(sasb_metric, "SASB")
# Result: StandardEsgMetric with name="CO2 Emissions Reduction", category="environmental"
# (Same normalized output!)
```

---

## Interoperability Patterns

### Pattern 1: Outbound API Integration

```python
# Other systems can consume GreenGauge data via REST API

# Before (fragmented data):
# System A: Bloomberg format
# System B: LSEG format
# System C: Bank-specific format

# After (unified via GreenGauge):
# All systems: GET /api/v1/loans → StandardLoan JSON
# All systems: GET /api/v1/loans/{id}/covenants → StandardCovenant JSON
# All systems: GET /api/v1/loans/{id}/esg → StandardEsgMetric JSON
```

### Pattern 2: Inbound Data Sync

```python
# GreenGauge accepts data from external systems and normalizes it

class UniversalDataImporter:
    """Accept data from any source and normalize it"""

    def import_from_source(self, raw_data: dict, source_system: str) -> List[StandardLoan]:
        """
        Import loans from any source system

        Supported sources:
        - "bloomberg": Bloomberg Terminal API
        - "lseg": LSEG/Refinitiv API
        - "swift": SWIFT MT300 messages
        - "csv": CSV file
        - "json": JSON file
        - "custom": Custom format with mapping
        """

        if source_system == "bloomberg":
            return self._import_bloomberg(raw_data)
        elif source_system == "lseg":
            return self._import_lseg(raw_data)
        elif source_system == "swift":
            return self._import_swift(raw_data)
        elif source_system == "csv":
            return self._import_csv(raw_data)
        elif source_system == "custom":
            return self._import_custom(raw_data)

    def _import_bloomberg(self, data: dict) -> List[StandardLoan]:
        # Bloomberg-specific import logic
        pass

    def _import_lseg(self, data: dict) -> List[StandardLoan]:
        # LSEG-specific import logic
        pass

    # ... other importers
```

### Pattern 3: Bilateral Sync

```python
# Sync data bidirectionally between GreenGauge and external systems

class BilateralSync:
    """Two-way data synchronization"""

    async def sync_with_bloomberg(self):
        """
        1. Fetch latest data from Bloomberg
        2. Normalize to GreenGauge format
        3. Merge with existing portfolio
        4. Update GreenGauge database
        5. Export changes back to Bloomberg
        """

        # Import Bloomberg → GreenGauge
        bloomberg_data = await self._fetch_bloomberg()
        normalized_loans = self._normalize_bloomberg_data(bloomberg_data)
        await self._update_greengauge_db(normalized_loans)

        # Export changes GreenGauge → Bloomberg
        changed_loans = self._identify_changes()
        await self._sync_changes_to_bloomberg(changed_loans)
```

---

## Data Quality Standards

### Quality Scorecard

```python
class DataQualityScorecard:
    """Measure data quality across dimensions"""

    QUALITY_METRICS = {
        "completeness": 0.25,      # All required fields present
        "accuracy": 0.25,           # Values match source truth
        "consistency": 0.25,        # No contradictions in data
        "timeliness": 0.25          # Data is recent/current
    }

    def calculate_quality_score(self, loan: StandardLoan) -> float:
        """Calculate 0-1 quality score"""

        completeness = self._measure_completeness(loan)
        accuracy = self._measure_accuracy(loan)
        consistency = self._measure_consistency(loan)
        timeliness = self._measure_timeliness(loan)

        return (
            completeness * 0.25 +
            accuracy * 0.25 +
            consistency * 0.25 +
            timeliness * 0.25
        )

    def _measure_completeness(self, loan: StandardLoan) -> float:
        """Check all required fields are populated"""
        required_fields = [
            "companyName", "loanAmount", "currency",
            "sector", "covenants", "esgMetrics"
        ]

        filled = sum(1 for field in required_fields if getattr(loan, field, None))
        return filled / len(required_fields)

    def _measure_accuracy(self, loan: StandardLoan) -> float:
        """Validate values against source system"""
        # Spot-check sample of values against source
        accuracy_checks = [
            self._validate_loan_amount(loan),
            self._validate_covenant_values(loan),
            self._validate_esg_values(loan)
        ]
        return sum(accuracy_checks) / len(accuracy_checks)

    def _measure_consistency(self, loan: StandardLoan) -> float:
        """Check for contradictions"""
        checks = [
            loan.originationDate < loan.maturityDate,
            loan.loanAmount > 0,
            len(loan.covenants) > 0
        ]
        return sum(checks) / len(checks)

    def _measure_timeliness(self, loan: StandardLoan) -> float:
        """Check data freshness"""
        days_old = (datetime.now() - loan.lastUpdated).days

        if days_old <= 30:
            return 1.0
        elif days_old <= 90:
            return 0.75
        elif days_old <= 180:
            return 0.5
        else:
            return 0.25

# Quality Targets
DATA_QUALITY_TARGETS = {
    "production": 0.95,    # 95% quality score minimum
    "staging": 0.85,       # 85% for non-production
    "demo": 0.70           # 70% for demo/sample data
}
```

---

## Compliance Mappings

### EU Taxonomy Alignment

```python
# Map loans to EU Taxonomy activities

EU_TAXONOMY_CODES = {
    "3.1": "Electricity generation from solar energy",
    "3.2": "Electricity generation from wind energy",
    "6.1": "Rapid transit systems",
    "7.1": "Acquisition and ownership of buildings"
}

class EuTaxonomyMapper:
    def map_loan(self, loan: StandardLoan) -> dict:
        """Classify loan against EU Taxonomy"""

        sector = loan.sector
        taxonomy_match = self._find_match(sector)

        if not taxonomy_match:
            return {"eligible": False}

        return {
            "eligible": True,
            "taxonomyCode": taxonomy_match["code"],
            "activity": taxonomy_match["description"],
            "climateContribution": {
                "mitigation": self._has_mitigation(loan),
                "adaptation": self._has_adaptation(loan)
            },
            "dnsh": self._assess_dnsh(loan)
        }
```

### CSRD Compliance

```python
# Map data to CSRD (Corporate Sustainability Reporting Directive) requirements

class CsrdCompliance:
    """Ensure CSRD compliance in reporting"""

    REQUIRED_DISCLOSURES = [
        "ESG governance structure",
        "Material ESG issues identification",
        "ESG performance targets",
        "ESG performance results",
        "Third-party verification"
    ]

    def generate_csrd_report(self, loans: List[StandardLoan]) -> dict:
        """Generate CSRD-compliant report"""

        return {
            "governance": self._extract_governance(loans),
            "materiality": self._assess_materiality(loans),
            "targets": self._aggregate_targets(loans),
            "results": self._aggregate_results(loans),
            "verification": self._compile_verifications(loans),
            "complianceStatus": self._check_compliance(loans)
        }
```

---

## Summary: Why Standardization Matters

| Benefit                   | Impact                                                |
| ------------------------- | ----------------------------------------------------- |
| **Interoperability**      | Systems can exchange data without custom integrations |
| **Data Quality**          | Consistent validation and error checking              |
| **Regulatory Compliance** | Automatically meet ESG disclosure requirements        |
| **Scalability**           | Add new data sources without rewriting code           |
| **Decision Making**       | Apples-to-apples comparison across portfolio          |

---

**Last Updated**: January 2025  
**Version**: 1.0  
**Next Review**: Q1 2025
