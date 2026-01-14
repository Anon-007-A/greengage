# PDF Export Implementation - Code Reference

## Core Function Signature

### Main Export Entry Point

```typescript
export async function exportPortfolioToPDF(
  portfolioData: PortfolioDataExport,
  scenarioLabel: string = "Baseline"
): Promise<void>;
```

## Usage Example

### In Reports.tsx

```typescript
// Data preparation
const portfolioData: PortfolioDataExport = {
  totalLoans: portfolioStatus.totalLoanCount,
  totalPortfolioValue: totalPortfolioValue / 1000000,
  breachedLoans: breachedLoanCount,
  atRiskLoans: atRiskLoanCount,
  totalBreaches: totalBreaches,
  portfolioGreenScore: portfolioGreenScore,
  avgRiskScore: Math.round(/* calculation */),
  esgResilience: Math.round(/* calculation */),
  co2Reduced: Math.round(summary.totalCO2Reduced / 1000),
  cleanEnergyGWh: summary.renewableEnergyGenerated,
  portfolioHeatIndex: calculatePortfolioHeatIndex(/*...*/),
  loans: portfolioStatus.loans.map(/* transformation */),
  breachedLoanDetails: breachDetails,
  atRiskLoanDetails: atRiskDetails,
  complianceStatus: complianceChecks.map(/* transformation */),
  darkGreenCount,
  lightGreenCount,
  transitionCount,
};

// Generate PDF
const scenarioLabel =
  reportMode === "baseline"
    ? "Baseline (No Stress)"
    : `Custom Scenario: ${reportEbitdaDrop}% EBITDA Drop, ${reportRateHike} bps Rate Hike`;

await exportPortfolioToPDF(portfolioData, scenarioLabel);
```

## Type Definitions

### Root Interface

```typescript
export interface PortfolioDataExport {
  totalLoans: number;
  totalPortfolioValue: number; // EUR millions
  breachedLoans: number;
  atRiskLoans: number;
  totalBreaches: number;
  portfolioGreenScore: number; // 0-100
  avgRiskScore: number; // 0-100
  esgResilience: number; // 0-100
  co2Reduced: number; // thousands of tons
  cleanEnergyGWh: number; // GWh
  loans: LoanDataExport[];
  breachedLoanDetails: BreachDetailExport[];
  atRiskLoanDetails: RiskDetailExport[];
  portfolioHeatIndex: number; // 0-100
  complianceStatus: ComplianceItemExport[];
  darkGreenCount: number;
  lightGreenCount: number;
  transitionCount: number;
}
```

### Nested Interfaces

```typescript
export interface LoanDataExport {
  id: string;
  company: string;
  sector: string;
  amount: number; // EUR millions
  status: "Safe" | "At Risk" | "Breached";
  esgRating: "Dark Green" | "Light Green" | "Transition";
  riskScore: number;
  covenant?: string;
}

export interface BreachDetailExport {
  company: string;
  covenant: string;
  stressedValue: number;
  threshold: number;
  severity: number; // 0-100%
  action: string;
}

export interface RiskDetailExport {
  company: string;
  covenant: string;
  stressedValue: number;
  threshold: number;
  cushion: number; // percentage
}

export interface ComplianceItemExport {
  name: string;
  status: "Complete" | "Pending" | "In Progress";
}
```

## PDF Structure

### Page 1 - Cover Page

```
┌─────────────────────────────────────────┐
│                                         │
│         GreenGauge                      │
│   CSRD Compliance & Covenant Risk       │
│          Report                         │
│                                         │
├─────────────────────────────────────────┤
│ Generated: December 19, 2024 - 14:30   │
│ Scenario: Baseline (No Stress)          │
│ Portfolio Value: €450.5M                │
│ Total Loans: 42                         │
└─────────────────────────────────────────┘
│ Executive Summary                       │
│ [Multi-paragraph narrative text]        │
│ [Portfolio highlights and impacts]      │
│ [ESG and risk metrics overview]         │
```

### Page 2+ - Content Sections

**Section 1: Key Performance Indicators**

```
┌────────────────────────────────────────────┐
│ Metric              │ Value      │ Status  │
├────────────────────────────────────────────┤
│ Portfolio Value     │ €450.5M    │ Active  │
│ Green Score         │ 78/100     │ Good    │
│ Avg Risk Score      │ 45/100     │ Mod. Risk
│ Heat Index          │ 35/100     │ Caution │
│ Total Breaches      │ 3          │ Alert   │
│ ESG Resilience      │ 72/100     │ Strong  │
│ CO₂ Reduced         │ 285K tons  │ Strong  │
│ Clean Energy        │ 156 GWh    │ Strong  │
└────────────────────────────────────────────┘
```

**Section 2: Loan Portfolio**

```
┌────────────────────────────────────────────────────────┐
│ Company      │ Sector   │ Amount │ Status  │ ESG │Risk │
├────────────────────────────────────────────────────────┤
│ Green Power  │ Solar    │ 12.5M  │ Safe    │ DG  │ 28  │
│ TransEnergy  │ Wind     │ 45.0M  │ At Risk │ LG  │ 52  │
│ EcoFarms     │ Water    │ 8.3M   │ Breached│ TN  │ 78  │
│ ...          │ ...      │ ...    │ ...     │ ... │ ... │
└────────────────────────────────────────────────────────┘
```

**Section 3: Covenant Breaches**

```
┌────────────────────────────────────────────────────────┐
│ Company    │ Covenant   │ Current │ Threshold│Sev│Action│
├────────────────────────────────────────────────────────┤
│ EcoFarms   │ Debt/EBITDA│ 5.2x    │ 4.0x     │95%│Waiver│
│ GreenFlow  │ LTV        │ 68%     │ 65%      │82%│Reset │
│ SolarMax   │ ICR        │ 2.1x    │ 2.5x     │75%│Plan  │
└────────────────────────────────────────────────────────┘
```

**Section 4: At-Risk Loans**

```
┌────────────────────────────────────────────────────────┐
│ Company     │ Covenant    │ Current │ Threshold│Cushion│
├────────────────────────────────────────────────────────┤
│ TransEnergy │ Debt Ratio  │ 3.8x    │ 4.0x     │ 5.0%  │
│ WindPower   │ Interest Cov│ 2.65x   │ 2.5x     │ 6.0%  │
│ AquaGreen   │ LTV         │ 62%     │ 65%      │ 4.6%  │
└────────────────────────────────────────────────────────┘
```

**Section 5: ESG & Resilience**

```
Portfolio ESG Composition:
• Dark Green Loans: 18 (42.9%)
• Light Green Loans: 16 (38.1%)
• Transition Loans: 8 (19.0%)

Environmental Impact:
• CO₂ Emissions Reduced: 285K tons per annum
• Clean Energy Generated: 156 GWh per annum

Covenant Resilience:
• Portfolio Heat Index: 35/100 - Caution
• ESG Resilience Score: 72/100 - Strong
• Safe Loans: 39/42 (92.9%)
```

**Section 6: Compliance Checklist**

```
┌──────────────────────────────────┐
│ Item                    │ Status  │
├──────────────────────────────────┤
│ Double Materiality      │Complete │
│ EU Taxonomy Alignment   │Complete │
│ Climate Risk Disclosure │Complete │
│ 3rd-Party Verification  │ Pending │
│ Audit Trail Docs        │Complete │
└──────────────────────────────────┘
```

## Integration Points

### 1. Data Collection

```typescript
// From useGreenGaugeStore()
const loans = store.loans;
const ebitdaDrop = store.ebitdaDropPercent;
const rateHike = store.interestRateHikeBps;

// From usePortfolioStatus()
const portfolioStatus = usePortfolioStatus(loans, ebitdaDrop, rateHike);
const { breachedLoanCount, atRiskLoanCount, totalBreaches } = portfolioStatus;

// From utility functions
const greenScore = calculatePortfolioGreenScore(loans, ebitdaDrop, rateHike);
const esgResilience = calculatePortfolioESGResilience(
  loans,
  ebitdaDrop,
  rateHike
);
const heatIndex = calculatePortfolioHeatIndex(portfolioStatus.loans).heatIndex;
const severity = calculateOverallLoanSeverity(loan, ebitdaDrop, rateHike);
```

### 2. Data Transformation

```typescript
// Breach details from status
const breachDetails = portfolioStatus.loans
  .filter((ls) => ls.status === "BREACHED")
  .flatMap((ls) =>
    ls.covenants
      .filter((c) => c.status === "BREACHED")
      .map((c) => ({
        company: ls.loan.companyName,
        covenant: c.name,
        stressedValue: c.stressedValue,
        threshold: c.threshold,
        severity: calculateOverallLoanSeverity([ls.loan], ebitdaDrop, rateHike),
        action: `Review and negotiate ${c.name} waiver with lender`,
      }))
  );

// ESG counts from classification
const darkGreenCount = loans.filter(
  (l) => l.esgClassification === "Dark Green"
).length;
const lightGreenCount = loans.filter(
  (l) => l.esgClassification === "Light Green"
).length;
const transitionCount = loans.filter(
  (l) => l.esgClassification === "Transition"
).length;
```

### 3. PDF Generation

```typescript
// Each page is added with proper Y position tracking
let currentY = margin;

// New pages are added when content exceeds page height
if (currentY > pageHeight - 80) {
  pdf.addPage();
  currentY = margin;
}

// Tables are auto-generated with proper styling
pdf.autoTable({
  head: [headerRow],
  body: dataRows,
  startY: currentY,
  margin: { left: margin, right: margin },
  theme: "grid",
  headStyles: { fillColor: [76, 175, 80], textColor: 255 },
  bodyStyles: { textColor: 50, fontSize: 9 },
});
```

## Styling System

### Color Scheme

```typescript
// Primary branding
const PRIMARY_GREEN = [76, 175, 80]; // #4CAF50

// Severity indicators
const SEVERITY_RED = [220, 50, 50]; // Critical
const SEVERITY_YELLOW = [255, 193, 7]; // At-risk
const SEVERITY_GREEN = [76, 175, 80]; // Healthy

// Text colors
const TEXT_DARK = [0, 0, 0];
const TEXT_MUTED = [150, 150, 150];
const TEXT_SECONDARY = [100, 100, 100];
```

### Typography

```
Headers:    helvetica, bold, 14pt, green
Section Titles: helvetica, bold, 12pt, color-coded
Body Text:  helvetica, regular, 10pt, dark gray
Table Head: helvetica, bold, 10pt, white on green
Table Body: helvetica, regular, 8-9pt, dark gray
```

### Page Layout

```
Margins:        15mm (all sides)
Page Size:      A4 (210x297mm)
Orientation:    Portrait
Table Widths:   Distributed equally across page width
Auto-breaks:    Triggered at pageHeight - 80mm threshold
```

## Error Handling

```typescript
try {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // PDF generation steps...

  pdf.save(`GreenGauge_CSRD_Report_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`);

  toast({ title: "PDF Generated Successfully", ... });
} catch (error) {
  console.error('Error exporting PDF:', error);
  toast({ title: "Error", description: "Failed to generate PDF...", variant: "destructive" });
}
```

## Dependencies Used

```typescript
// PDF Generation
import jsPDF from "jspdf";

// Date Formatting
import { format } from "date-fns";

// Note: html2canvas is installed but not used in current implementation
// It can be added for future chart embedding feature
import html2canvas from "html2canvas"; // Future use
```

## Performance Optimization

1. **Client-Side Processing** - No server round-trips
2. **Single Document Instance** - All content added to one PDF
3. **Efficient Table Rendering** - jsPDF autoTable handles complex layouts
4. **Minimal Metadata** - Only essential PDF properties set
5. **Streaming Download** - File saved directly to browser disk

## File Naming Convention

**Pattern**: `GreenGauge_CSRD_Report_YYYY-MM-DD_HHmm.pdf`

**Examples**:

- `GreenGauge_CSRD_Report_2024-12-19_1430.pdf` (Dec 19, 2024 at 2:30 PM)
- `GreenGauge_CSRD_Report_2024-01-15_0945.pdf` (Jan 15, 2024 at 9:45 AM)

**Components**:

- Prefix: `GreenGauge_CSRD_Report_`
- Date: YYYY-MM-DD (ISO format)
- Time: HHmm (24-hour format)
- Extension: `.pdf`

---

## Testing Scenarios

### Scenario 1: Baseline Export

```
Mode: Baseline
EBITDA Drop: 0%
Rate Hike: 0 bps
Expected: Current portfolio status unchanged
PDF Sections: All 8 complete
```

### Scenario 2: Mild Stress

```
Mode: Custom
EBITDA Drop: 15%
Rate Hike: 100 bps
Expected: Some covenants move to At-Risk
PDF Sections: Breach section may expand
```

### Scenario 3: Severe Stress

```
Mode: Custom
EBITDA Drop: 50%
Rate Hike: 300 bps
Expected: Multiple covenant breaches
PDF Sections: Breach details section significant
```

---

## Troubleshooting

### PDF Not Generated

1. Check browser console for errors
2. Verify all imports are correct
3. Ensure portfolioData is properly populated
4. Check disk space for file write

### Incorrect Data in PDF

1. Verify calculations in data aggregation phase
2. Check loan status filters (BREACHED vs AT_RISK)
3. Confirm stress parameters are applied
4. Review covenant threshold values

### Large File Size

1. Reduce number of loan details included
2. Use lower resolution for chart images
3. Compress PDF before distribution
4. Consider splitting into multiple documents

### Styling Issues

1. Verify color RGB values in PDFDocument
2. Check table column widths match content
3. Ensure auto-breaks trigger correctly
4. Test with various portfolio sizes

---

**Last Updated**: 2024-12-19
**Status**: Production Ready
**Version**: 1.0
