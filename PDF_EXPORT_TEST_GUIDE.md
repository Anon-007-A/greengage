# 🧪 PDF Export - Quick Test Guide

## Status: ✅ Ready to Test

The PDF export feature has been fixed and is ready for testing. Follow these steps to verify it works.

---

## Quick Test (5 minutes)

### Step 1: Start the App

The development server is already running on **http://localhost:8081**

If not, open terminal and run:

```bash
npm run dev
```

### Step 2: Open Reports Page

Navigate to: `http://localhost:8081/reports`

### Step 3: Click Export

In the "Portfolio Summary Report" card, click the blue **"Export CSRD Report"** button

### Step 4: Verify PDF

✅ Look for download notification (bottom of browser)  
✅ File should be named: `GreenGauge_CSRD_Report_2026-01-04_XXXX.pdf`  
✅ Open the PDF to verify content

---

## Expected PDF Content

The PDF should have these sections:

### Page 1

- **GreenGauge** title (green text)
- Generated date and scenario label
- **Portfolio Summary** box with:
  - Total Loans: [number]
  - Portfolio Value: €[amount]M
  - Breached: [number]
  - At Risk: [number]
  - Green Score: [0-100]
  - Risk Score: [0-100]
  - Heat Index: [0-100]
  - ESG Resilience: [0-100]

### Page 1-2

- **Environmental Impact** section:

  - CO₂ Reduced: [amount]K tonnes
  - Clean Energy Generated: [amount] GWh

- **Loan Portfolio** table with columns:
  - Company
  - Sector
  - Amount (€M)
  - Status (Safe/At Risk/Breached)
  - ESG (Dark Green/Light Green/Transition)
  - Risk Score

### Page 2+

- **Covenant Breaches** (if any exist)

  - Company and covenant name
  - Stressed values vs thresholds
  - Severity score

- **At-Risk Loans** (if any exist)

  - Early warning section
  - Cushion percentages

- **CSRD Compliance Checklist**
  - Double Materiality Assessment
  - EU Taxonomy Alignment
  - Climate Risk Disclosure
  - Third-Party Verification
  - Audit Trail Documentation

### Last Page

- Footer with generation timestamp

---

## Success Criteria

✅ PDF generates without error  
✅ File downloads to Downloads folder  
✅ PDF opens in PDF viewer (Adobe, browser, etc.)  
✅ All 8 sections are present  
✅ Data values match dashboard numbers  
✅ Formatting is professional (colors, tables, spacing)  
✅ No blank pages or corrupted content

---

## Test Different Scenarios

### Test 1: Baseline Mode

1. Select "Use Current Baseline"
2. Click "Export CSRD Report"
3. Verify: PDF labeled as "Baseline (No Stress)"

### Test 2: Custom Stress Scenario

1. Select "Use Custom Stress Scenario"
2. Set EBITDA Drop: 20%
3. Set Rate Hike: 200 bps
4. Click "Export CSRD Report"
5. Verify: PDF shows custom parameters
6. Verify: Breach/at-risk sections show stressed values

### Test 3: No Stresses

1. Baseline mode with no EBITDA drop
2. Verify: Only Safe loans appear in table
3. Verify: Breach and at-risk sections are minimal

### Test 4: High Stress

1. Custom mode with 50% EBITDA drop + 400 bps rate
2. Verify: Multiple breaches show in PDF
3. Verify: At-risk section is populated

---

## If PDF Doesn't Generate

### Check #1: Browser Console

1. Press **F12** to open Developer Tools
2. Click **Console** tab
3. Click "Export CSRD Report" again
4. Look for **red error messages**
5. Copy the error and share it

**Common errors to look for**:

- `Cannot find module 'generatePDF'`
- `TypeError: pdf.text is not a function`
- `Failed to generate PDF...`

### Check #2: Verify Dependencies

```bash
npm list jspdf html2canvas date-fns
```

Should show:

- jspdf@4.0.0 (or similar)
- html2canvas@1.4.1 (or similar)
- date-fns@4.1.0 (or similar)

If missing, run:

```bash
npm install jspdf html2canvas date-fns
```

### Check #3: Check Network Tab

1. Open DevTools (F12)
2. Click **Network** tab
3. Click "Export CSRD Report"
4. Look for any failed requests
5. Check the **Console** for errors

### Check #4: Try Manual Test

In browser console, paste:

```javascript
console.log("Testing PDF generation...");
// This will show if JavaScript is working
```

---

## Expected Output

### Success Toast (top right)

```
✓ PDF Generated Successfully
  CSRD compliance report has been downloaded.
```

### File Downloaded

```
Downloads folder:
  → GreenGauge_CSRD_Report_2026-01-04_1530.pdf (120 KB)
```

### PDF Opens

```
GreenGauge
CSRD Compliance & Covenant Risk Report

Generated: January 4, 2026 at 15:30
Scenario: Baseline (No Stress)

[Portfolio Summary Box]
Total Loans: 42
Portfolio Value: €450.5M
...
```

---

## Troubleshooting Checklist

| Check                 | Status | Action                           |
| --------------------- | ------ | -------------------------------- |
| Dev server running    | ✅     | Verify port 8081                 |
| npm build passed      | ✅     | Run `npm run build`              |
| generatePDF.ts exists | ✅     | Check `src/utils/generatePDF.ts` |
| Reports.tsx updated   | ✅     | Check imports                    |
| jspdf installed       | ⏳     | Run `npm list jspdf`             |
| PDF generation works  | ⏳     | Test the button                  |
| File downloads        | ⏳     | Check Downloads folder           |
| PDF content correct   | ⏳     | Open and verify                  |

---

## Performance Expectations

- **Generation Time**: 200-400 milliseconds (very fast)
- **File Size**: 80-150 KB (small and manageable)
- **Pages**: 2-5 pages (depends on loan count)
- **Load Time in Viewer**: <1 second

---

## Next Steps After Testing

### If PDF Exports Successfully ✅

1. Share the generated PDF for review
2. Verify all team members can access Reports page
3. Document the feature in release notes
4. Deploy to production

### If PDF Has Issues ❌

1. Check error messages in browser console
2. Verify all dependencies are installed
3. Check that portfolio has loan data
4. Clear browser cache: Ctrl+Shift+Delete
5. Report exact error message to development team

---

## Support

**For technical issues**: Check the browser console for error messages  
**For feature questions**: See [PDF_EXPORT_BUG_FIX.md](PDF_EXPORT_BUG_FIX.md)  
**For detailed info**: See [PDF_EXPORT_IMPLEMENTATION.md](PDF_EXPORT_IMPLEMENTATION.md)

---

## Summary

The PDF export feature is fixed and ready. The test should take **5 minutes** and confirm the feature works as expected.

**Expected Result**: Professional CSRD compliance PDF that downloads automatically when you click the button.

---

**Status**: ✅ READY TO TEST  
**Date**: January 4, 2026  
**Version**: 1.0 (Fixed)
