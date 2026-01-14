# GreenGauge PDF Export - Quick Start Guide

## What's New

The GreenGauge platform now supports professional PDF export of CSRD compliance reports directly from the Reports page.

## How to Use

### 1. Navigate to Reports Page

- Click **"CSRD Reports"** in the main navigation menu

### 2. Select Export Mode

Choose one of two options:

- **Baseline Mode**: Exports current portfolio without stress testing
- **Custom Scenario**: Apply EBITDA drop % and interest rate hike (bps) to see impact

### 3. Generate PDF

- Click **"Export CSRD Report"** button
- PDF automatically downloads with naming format: `GreenGauge_CSRD_Report_YYYY-MM-DD_HHmm.pdf`

### 4. Review Content

The generated PDF includes 8 comprehensive sections:

1. **Cover Page** - Title, metadata, generated date
2. **Executive Summary** - Portfolio highlights and key metrics
3. **KPI Dashboard** - 9 essential performance indicators
4. **Loan Portfolio** - Complete inventory of all loans with metrics
5. **Covenant Breaches** - Detailed breach analysis with recommended actions
6. **At-Risk Loans** - Early warning section for loans near thresholds
7. **ESG & Resilience** - Environmental impact and resilience metrics
8. **Compliance Checklist** - CSRD regulatory compliance tracking

## File Locations

**New Files Created:**

- `src/utils/pdfExporter.ts` - PDF generation utility (512 lines)

**Files Updated:**

- `src/pages/Reports.tsx` - Integrated PDF export handler
- `package.json` - Added jspdf, html2canvas, @types/jspdf, date-fns

## PDF Features

✅ **Professional Formatting**

- A4 page format with proper margins
- Color-coded severity indicators (Green/Yellow/Red)
- Auto-scaling tables for any portfolio size
- Automatic page breaks

✅ **Complete Data Coverage**

- Portfolio summary metrics
- Loan-level detailed analysis
- Covenant-specific breach information
- ESG classification breakdown
- Environmental impact quantification
- Compliance tracking

✅ **Regulatory Compliance**

- CSRD framework aligned
- EU Taxonomy categories
- Double materiality assessment
- Audit trail support

## Stress Testing Integration

Export reports under different stress scenarios:

**Baseline (No Stress)**

- Current portfolio state
- No EBITDA reduction
- No interest rate changes

**Custom Scenario**

- EBITDA Drop: 0-100%
- Interest Rate Hike: 0-500 basis points
- Real-time impact on covenant status
- Breach predictions

## Example Workflow

```
Portfolio Manager Views Dashboard
         ↓
Reviews covenant breaches and at-risk loans
         ↓
Opens Reports page
         ↓
Applies 20% EBITDA drop + 200bps rate hike
         ↓
Generates PDF report
         ↓
Downloads: GreenGauge_CSRD_Report_2024-12-19_1430.pdf
         ↓
Submits to regulatory authorities
```

## Technical Details

### Dependencies

- `jspdf@2.5.1` - PDF generation
- `html2canvas@1.x` - Canvas rendering
- `date-fns@3.6.0` - Date formatting

### Build Status

✅ `npm run build` - Passes successfully
✅ `npm run dev` - Running on port 8081
✅ TypeScript strict mode - Compliant

### Export Interface

```typescript
interface PortfolioDataExport {
  totalLoans: number;
  totalPortfolioValue: number;
  breachedLoans: number;
  atRiskLoans: number;
  totalBreaches: number;
  portfolioGreenScore: number;
  avgRiskScore: number;
  esgResilience: number;
  co2Reduced: number;
  cleanEnergyGWh: number;
  loans: LoanDataExport[];
  breachedLoanDetails: BreachDetailExport[];
  atRiskLoanDetails: RiskDetailExport[];
  portfolioHeatIndex: number;
  complianceStatus: ComplianceItemExport[];
  darkGreenCount: number;
  lightGreenCount: number;
  transitionCount: number;
}
```

## Testing Instructions

### Manual Test

1. Start dev server: `npm run dev`
2. Navigate to Reports page: http://localhost:8081/reports
3. Select baseline or custom scenario
4. Click "Export CSRD Report"
5. Open PDF in any viewer to verify all sections

### Data Validation

✓ KPI values match dashboard metrics
✓ Loan count matches portfolio total
✓ Covenant breaches match breach indicators
✓ ESG categories sum to total loans
✓ Heat index reflects current stress parameters

## Customization Options (Future)

Future versions will support:

- Custom company branding/logo
- User-selectable report sections
- Digital signature support
- Multi-language output
- Chart image embedding
- Direct email distribution

## Support

For issues or questions:

1. Check browser console for error messages
2. Verify PDF dependencies are installed: `npm list jspdf html2canvas`
3. Ensure stress test parameters are within valid ranges
4. Try exporting in baseline mode first

## Version Information

- **Feature**: PDF Export for CSRD Reports
- **Status**: Production Ready
- **Rollout**: December 2024
- **Updated**: 2024-12-19
