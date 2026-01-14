import { logger } from '@/lib/logger';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

/**
 * Type-safe interface for portfolio data
 */
interface PortfolioData {
  auditTrail: any[];
  taxonomyAlignment: { aligned: number; partiallyAligned: number; notAligned: number; };
  doubleMateriality: { financial: string; environmental: string; social: string; };
  totalLoans: number;
  totalPortfolioValue: number;
  breachedLoans: number;
  atRiskLoans: number;
  totalBreaches: number;
  portfolioGreenScore: number;
  avgRiskScore: number;
  portfolioHeatIndex?: number;
  esgResilience?: number;
  co2Reduced: number;
  cleanEnergyGWh: number;
  loans?: LoanData[];
  breachedLoanDetails?: BreachDetail[];
  atRiskLoanDetails?: RiskDetail[];
  complianceStatus?: ComplianceItem[];
}

interface LoanData {
  company: string;
  sector: string;
  amount: number;
  status: string;
  esgRating: string;
  riskScore: number | string;
}

interface BreachDetail {
  company: string;
  covenant: string;
  stressedValue: number;
  threshold: number;
  severity?: number;
}

interface RiskDetail {
  company: string;
  covenant: string;
  stressedValue: number;
  threshold: number;
  cushion?: number;
}

interface ComplianceItem {
  name: string;
  status: string;
}

// ============= COLOR PALETTE =============
const COLORS = {
  green: [76, 175, 80],
  yellow: [255, 193, 7],
  red: [220, 50, 50],
  darkGreen: [56, 142, 60],
  orange: [255, 152, 0],
  lightGray: [245, 245, 245],
  darkGray: [100, 100, 100],
  mediumGray: [150, 150, 150],
};

const safeNumber = (value: any, fallback: number = 0): number => {
  const num = Number(value);
  return isNaN(num) ? fallback : num;
};

const safeString = (value: any, fallback: string = 'N/A'): string => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

function drawSeverityBar(
  pdf: jsPDF,
  severity: number,
  x: number,
  y: number,
  width: number = 120
): number {
  const safeSeverity = safeNumber(severity, 0);
  const percent = Math.min(100, Math.max(0, safeSeverity));
  const filledWidth = (percent / 100) * width;

  let barColor = COLORS.green;
  if (percent > 50) barColor = COLORS.red;
  else if (percent > 20) barColor = COLORS.orange;

  pdf.setFillColor(230, 230, 230);
  pdf.rect(x, y, width, 6, 'F');

  pdf.setFillColor(barColor[0], barColor[1], barColor[2]);
  pdf.rect(x, y, filledWidth, 6, 'F');

  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.5);
  pdf.rect(x, y, width, 6);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(0, 0, 0);
  pdf.text(`${percent}%`, x + width + 3, y + 5);

  return 8;
}

function drawRiskStackedBar(
  pdf: jsPDF,
  safe: number,
  atRisk: number,
  breached: number,
  x: number,
  y: number,
  width: number = 150,
  height: number = 30
): number {
  const total = safe + atRisk + breached || 1;
  const safePercent = safe / total;
  const atRiskPercent = atRisk / total;
  const breachedPercent = breached / total;

  let currentX = x;

  // Safe segment
  const safeWidth = safePercent * width;
  pdf.setFillColor(COLORS.green[0], COLORS.green[1], COLORS.green[2]);
  pdf.rect(currentX, y, safeWidth, height, 'F');
  
  if (safeWidth > 20) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(255, 255, 255);
    const pct = Math.round(safePercent * 100);
    pdf.text(`${pct}%`, currentX + safeWidth / 2 - 5, y + height / 2 + 3);
  }
  currentX += safeWidth;

  // At Risk segment
  const atRiskWidth = atRiskPercent * width;
  if (atRiskWidth > 0) {
    pdf.setFillColor(COLORS.yellow[0], COLORS.yellow[1], COLORS.yellow[2]);
    pdf.rect(currentX, y, atRiskWidth, height, 'F');
    
    if (atRiskWidth > 20) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(0, 0, 0);
      const pct = Math.round(atRiskPercent * 100);
      pdf.text(`${pct}%`, currentX + atRiskWidth / 2 - 5, y + height / 2 + 3);
    }
  }
  currentX += atRiskWidth;

  // Breached segment
  const breachedWidth = breachedPercent * width;
  if (breachedWidth > 0) {
    pdf.setFillColor(COLORS.red[0], COLORS.red[1], COLORS.red[2]);
    pdf.rect(currentX, y, breachedWidth, height, 'F');
    
    if (breachedWidth > 20) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(255, 255, 255);
      const pct = Math.round(breachedPercent * 100);
      pdf.text(`${pct}%`, currentX + breachedWidth / 2 - 5, y + height / 2 + 3);
    }
  }

  pdf.setDrawColor(100, 100, 100);
  pdf.setLineWidth(1);
  pdf.rect(x, y, width, height);

  return height + 12;
}

function getStatusAlert(breached: number, atRisk: number): { color: number[]; message: string } {
  if (breached > 0) {
    return { color: COLORS.red, message: `🚨 ALERT: ${breached} loan(s) breached, ${atRisk} at risk` };
  }
  if (atRisk > 0) {
    return { color: COLORS.yellow, message: `⚠️ WARNING: ${atRisk} loan(s) at risk` };
  }
  return { color: COLORS.green, message: '✓ All loans compliant' };
}

function addPageHeader(pdf: jsPDF, scenario: string): void {
  const pageWidth = pdf.internal.pageSize.getWidth();
  
  pdf.setFillColor(56, 142, 60);
  pdf.rect(0, 0, pageWidth, 20, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(255, 255, 255);
  pdf.text('GreenGauge | CSRD Compliance Report', 12, 12);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(200, 200, 200);
  pdf.text(scenario, pageWidth - 60, 12);
}

function addPageFooter(pdf: jsPDF, pageNum: number, totalPages: number): void {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const footerY = pageHeight - 10;

  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.5);
  pdf.line(12, footerY - 8, pageWidth - 12, footerY - 8);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(150, 150, 150);

  const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm');
  pdf.text(`GreenGauge | Generated ${timestamp}`, 12, footerY - 2);
  pdf.text(`Page ${pageNum} of ${totalPages}`, pageWidth - 30, footerY - 2);
}

export async function generateCSRDReportPDF(
  portfolioData: PortfolioData,
  scenarioLabel: string = 'Baseline'
): Promise<void> {
  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 25.4; // 1 inch margins
    const defaultLineHeight = 6;
    let currentY = margin + 22;
    let pageNum = 1;

    addPageHeader(pdf, scenarioLabel);

    // Base font (Helvetica used as a close substitute for Calibri in PDF export)
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(20);
    pdf.setTextColor(COLORS.darkGreen[0], COLORS.darkGreen[1], COLORS.darkGreen[2]);
    pdf.text('GreenGauge', margin, currentY);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(COLORS.mediumGray[0], COLORS.mediumGray[1], COLORS.mediumGray[2]);
    currentY += 7;
    // Wrap long header lines correctly
    const headerLines = pdf.splitTextToSize('CSRD Compliance & Covenant Risk Analysis', pageWidth - margin * 2);
    headerLines.forEach((ln: string) => {
      pdf.text(ln, margin, currentY);
      currentY += defaultLineHeight;
    });

    currentY += 2;
    const genLines = pdf.splitTextToSize(`Generated: ${format(new Date(), 'MMMM dd, yyyy HH:mm')}`, pageWidth - margin * 2);
    genLines.forEach((ln: string, i: number) => {
      pdf.text(ln, margin, currentY + i * defaultLineHeight);
    });
    currentY += defaultLineHeight;
    pdf.text(`Scenario: ${scenarioLabel}`, margin, currentY + 2);
    currentY += defaultLineHeight + 8;

    currentY += 8;
    const status = getStatusAlert(safeNumber(portfolioData.breachedLoans), safeNumber(portfolioData.atRiskLoans));
    
    const alertBoxWidth = pageWidth - 2 * margin;
    const alertBoxHeight = 18;
    
    pdf.setFillColor(status.color[0], status.color[1], status.color[2]);
    pdf.rect(margin, currentY, alertBoxWidth, alertBoxHeight, 'F');
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(255, 255, 255);
    pdf.text(status.message, margin + 5, currentY + 12);
    
    currentY += alertBoxHeight + 8;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(COLORS.darkGreen[0], COLORS.darkGreen[1], COLORS.darkGreen[2]);
    pdf.text('Portfolio Overview', margin, currentY);
    currentY += 8;

    const cardWidth = (pageWidth - 3 * margin) / 2;
    const cardHeight = 28;
    const cardY = currentY;

    const kpiData = [
      { label: 'Total Portfolio', value: `€${safeNumber(portfolioData.totalPortfolioValue).toFixed(1)}M`, color: COLORS.green },
      { label: 'Green Score', value: `${safeNumber(portfolioData.portfolioGreenScore)}/100`, color: COLORS.green },
      { label: 'Risk Score', value: `${safeNumber(portfolioData.avgRiskScore)}/100`, color: COLORS.orange },
      { label: 'Heat Index', value: `${safeNumber(portfolioData.portfolioHeatIndex)}/100`, color: COLORS.orange },
    ];

    kpiData.forEach((kpi, idx) => {
      const row = Math.floor(idx / 2);
      const col = idx % 2;
      const cardX = margin + col * (cardWidth + margin);
      const cardYPos = cardY + row * (cardHeight + margin);

      pdf.setFillColor(COLORS.lightGray[0], COLORS.lightGray[1], COLORS.lightGray[2]);
      pdf.rect(cardX, cardYPos, cardWidth, cardHeight, 'F');

      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.5);
      pdf.rect(cardX, cardYPos, cardWidth, cardHeight);

      pdf.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
      pdf.circle(cardX + 4, cardYPos + 4, 2, 'F');

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(COLORS.mediumGray[0], COLORS.mediumGray[1], COLORS.mediumGray[2]);
      pdf.text(kpi.label, cardX + 8, cardYPos + 5);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
      pdf.text(kpi.value, cardX + 8, cardYPos + 17);
    });

    currentY = cardY + 2 * (cardHeight + margin) + 8;

    if (currentY > pageHeight - margin - 20) {
      pageNum++;
      pdf.addPage();
      addPageHeader(pdf, scenarioLabel);
      currentY = margin + 22;
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(COLORS.darkGreen[0], COLORS.darkGreen[1], COLORS.darkGreen[2]);
    pdf.text('Portfolio Risk Status', margin, currentY);

    currentY += 8;

    const legendBoxSize = 3;
    const legendY = currentY;

    pdf.setFillColor(COLORS.green[0], COLORS.green[1], COLORS.green[2]);
    pdf.rect(margin, legendY, legendBoxSize, legendBoxSize, 'F');
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text(`Safe: ${safeNumber(portfolioData.totalLoans) - safeNumber(portfolioData.breachedLoans) - safeNumber(portfolioData.atRiskLoans)}`, margin + 5, legendY + 2);

    pdf.setFillColor(COLORS.yellow[0], COLORS.yellow[1], COLORS.yellow[2]);
    pdf.rect(margin + 45, legendY, legendBoxSize, legendBoxSize, 'F');
    pdf.text(`At Risk: ${safeNumber(portfolioData.atRiskLoans)}`, margin + 50, legendY + 2);

    pdf.setFillColor(COLORS.red[0], COLORS.red[1], COLORS.red[2]);
    pdf.rect(margin + 90, legendY, legendBoxSize, legendBoxSize, 'F');
    pdf.text(`Breached: ${safeNumber(portfolioData.breachedLoans)}`, margin + 95, legendY + 2);

    currentY += 8;

    const safe = safeNumber(portfolioData.totalLoans) - safeNumber(portfolioData.breachedLoans) - safeNumber(portfolioData.atRiskLoans);
    const atRisk = safeNumber(portfolioData.atRiskLoans);
    const breached = safeNumber(portfolioData.breachedLoans);

    currentY += drawRiskStackedBar(pdf, safe, atRisk, breached, margin, currentY, pageWidth - 2 * margin);

    if (currentY > pageHeight - margin - 60) {
      pageNum++;
      pdf.addPage();
      addPageHeader(pdf, scenarioLabel);
      currentY = margin + 22;
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(COLORS.darkGreen[0], COLORS.darkGreen[1], COLORS.darkGreen[2]);
    pdf.text('ESG & Environmental Impact', margin, currentY);

    currentY += 8;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);

    const metrics = [
      { label: 'Green Score', value: `${safeNumber(portfolioData.portfolioGreenScore)}/100`, unit: '' },
      { label: 'ESG Resilience', value: `${safeNumber(portfolioData.esgResilience, 0)}/100`, unit: '' },
      { label: 'CO₂ Reduced', value: `${safeNumber(portfolioData.co2Reduced)}`, unit: 'K tonnes' },
      { label: 'Clean Energy', value: `${safeNumber(portfolioData.cleanEnergyGWh)}`, unit: 'GWh' },
    ];

    metrics.forEach((metric, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const metricX = margin + col * (pageWidth / 2);
      const metricY = currentY + row * 10;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(COLORS.mediumGray[0], COLORS.mediumGray[1], COLORS.mediumGray[2]);
      // Wrap metric label/value if too long
      const labelLines = pdf.splitTextToSize(`${metric.label}:`, pageWidth / 2 - 10);
      labelLines.forEach((ln: string, i: number) => {
        pdf.text(ln, metricX, metricY + i * defaultLineHeight);
      });

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(COLORS.green[0], COLORS.green[1], COLORS.green[2]);
      const valueLines = pdf.splitTextToSize(`${metric.value}${metric.unit ? ' ' + metric.unit : ''}`, pageWidth / 2 - 50);
      valueLines.forEach((ln: string, i: number) => {
        pdf.text(ln, metricX + 40, metricY + i * defaultLineHeight);
      });
    });

    currentY += 22;

    if (currentY > pageHeight - margin - 60) {
      pageNum++;
      pdf.addPage();
      addPageHeader(pdf, scenarioLabel);
      currentY = margin + 22;
    }

    if (portfolioData.loans && portfolioData.loans.length > 0) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(COLORS.darkGreen[0], COLORS.darkGreen[1], COLORS.darkGreen[2]);
      pdf.text('Loan Portfolio Details', margin, currentY);

      currentY += 8;

      const colWidths = [40, 30, 20, 25, 20, 20];
      const rowHeight = 6;
      const headers = ['Company', 'Sector', 'Amount', 'Status', 'ESG', 'Risk'];

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setFillColor(COLORS.darkGreen[0], COLORS.darkGreen[1], COLORS.darkGreen[2]);
      pdf.setTextColor(255, 255, 255);

      let xPos = margin;
      headers.forEach((header, idx) => {
        pdf.rect(xPos, currentY, colWidths[idx], rowHeight, 'F');
        // header may be long, wrap if needed
        const headerLines = pdf.splitTextToSize(header, colWidths[idx] - 4);
        headerLines.forEach((hl: string, i: number) => {
          pdf.text(hl, xPos + 2, currentY + 4 + i * (rowHeight));
        });
        xPos += colWidths[idx];
      });

      currentY += rowHeight;

      portfolioData.loans.forEach((loan, rowIdx) => {
        if (rowIdx % 2 === 0) {
          xPos = margin;
          headers.forEach((_, idx) => {
            pdf.setFillColor(COLORS.lightGray[0], COLORS.lightGray[1], COLORS.lightGray[2]);
            pdf.rect(xPos, currentY, colWidths[idx], rowHeight, 'F');
            xPos += colWidths[idx];
          });
        }

        xPos = margin;
        headers.forEach((_, idx) => {
          pdf.setDrawColor(200, 200, 200);
          pdf.setLineWidth(0.3);
          pdf.rect(xPos, currentY, colWidths[idx], rowHeight);
          xPos += colWidths[idx];
        });

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(0, 0, 0);

        const rowData = [
          safeString(loan.company, 'N/A').substring(0, 20),
          safeString(loan.sector, 'N/A').substring(0, 15),
          `€${safeNumber(loan.amount).toFixed(1)}M`,
          safeString(loan.status, 'N/A'),
          safeString(loan.esgRating, 'N/A').substring(0, 12),
          `${safeNumber(loan.riskScore)}`,
        ];

        xPos = margin;
        rowData.forEach((data, idx) => {
          const cellLines = pdf.splitTextToSize(data, colWidths[idx] - 4);
          cellLines.forEach((cl: string, i: number) => {
            pdf.text(cl, xPos + 2, currentY + 4 + i * (defaultLineHeight - 1));
          });
          xPos += colWidths[idx];
        });

        currentY += rowHeight;

        if (currentY > pageHeight - margin - 20) {
          pageNum++;
          pdf.addPage();
          addPageHeader(pdf, scenarioLabel);
          currentY = margin + 22;
        }
      });

      currentY += 8;
    }

    if (currentY > pageHeight - margin - 60) {
      pageNum++;
      pdf.addPage();
      addPageHeader(pdf, scenarioLabel);
      currentY = margin + 22;
    }

    if (portfolioData.breachedLoanDetails && portfolioData.breachedLoanDetails.length > 0) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(COLORS.red[0], COLORS.red[1], COLORS.red[2]);
      pdf.text('⚠️ Covenant Breaches', margin, currentY);

      currentY += 8;

      portfolioData.breachedLoanDetails.forEach((breach, idx) => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(COLORS.red[0], COLORS.red[1], COLORS.red[2]);
        pdf.text(`${idx + 1}. ${safeString(breach.company)} — ${safeString(breach.covenant)}`, margin, currentY);

        currentY += 6;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(0, 0, 0);

        const stressedVal = safeNumber(breach.stressedValue, 0).toFixed(2);
        const thresholdVal = safeNumber(breach.threshold, 0).toFixed(2);

        pdf.text(`Stressed: ${stressedVal}x | Threshold: ${thresholdVal}x`, margin + 3, currentY);
        currentY += 5;

        if (breach.severity !== undefined) {
          const severity = safeNumber(breach.severity, 0);
          currentY += drawSeverityBar(pdf, severity, margin + 3, currentY, 100);
          currentY += 2;
        }

        currentY += 3;

        if (currentY > pageHeight - margin - 20) {
          pageNum++;
          pdf.addPage();
          addPageHeader(pdf, scenarioLabel);
          currentY = margin + 22;
        }
      });
    }

    if (currentY > pageHeight - margin - 60) {
      pageNum++;
      pdf.addPage();
      addPageHeader(pdf, scenarioLabel);
      currentY = margin + 22;
    }

    if (portfolioData.atRiskLoanDetails && portfolioData.atRiskLoanDetails.length > 0) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(COLORS.yellow[0], COLORS.yellow[1], COLORS.yellow[2]);
      pdf.text('⚠️ At-Risk Loans (within 10% of threshold)', margin, currentY);

      currentY += 8;

      portfolioData.atRiskLoanDetails.forEach((risk, idx) => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(COLORS.orange[0], COLORS.orange[1], COLORS.orange[2]);
        pdf.text(`${idx + 1}. ${safeString(risk.company)} — ${safeString(risk.covenant)}`, margin, currentY);

        currentY += 6;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(0, 0, 0);

        const stressedVal = safeNumber(risk.stressedValue, 0).toFixed(2);
        const thresholdVal = safeNumber(risk.threshold, 0).toFixed(2);

        pdf.text(`Stressed: ${stressedVal}x | Threshold: ${thresholdVal}x`, margin + 3, currentY);
        currentY += 5;

        if (risk.cushion !== undefined) {
          const cushion = safeNumber(risk.cushion, 0);
          pdf.text(`Cushion Remaining: ${cushion.toFixed(1)}%`, margin + 3, currentY);
          currentY += 5;
        }

        currentY += 3;

        if (currentY > pageHeight - margin - 20) {
          pageNum++;
          pdf.addPage();
          addPageHeader(pdf, scenarioLabel);
          currentY = margin + 22;
        }
      });

      currentY += 8;
    }

    if (currentY > pageHeight - margin - 60) {
      pageNum++;
      pdf.addPage();
      addPageHeader(pdf, scenarioLabel);
      currentY = margin + 22;
    }

    if (portfolioData.complianceStatus && portfolioData.complianceStatus.length > 0) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(COLORS.darkGreen[0], COLORS.darkGreen[1], COLORS.darkGreen[2]);
      pdf.text('CSRD Compliance Checklist', margin, currentY);

      currentY += 8;

      portfolioData.complianceStatus.forEach((item) => {
        const status = safeString(item.status, 'Pending').toUpperCase();
        const isComplete = status.includes('COMPLETE');

        const symbol = isComplete ? '✓' : '○';
        const color = isComplete ? COLORS.green : COLORS.orange;

        pdf.setTextColor(color[0], color[1], color[2]);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.text(`${symbol} ${safeString(item.name)}`, margin + 2, currentY);

        pdf.setTextColor(COLORS.mediumGray[0], COLORS.mediumGray[1], COLORS.mediumGray[2]);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.text(`[${status}]`, pageWidth - margin - 20, currentY);

        currentY += 7;

        if (currentY > pageHeight - margin - 20) {
          pageNum++;
          pdf.addPage();
          addPageHeader(pdf, scenarioLabel);
          currentY = margin + 22;
        }
      });
    }

    // EU Taxonomy & Double Materiality Sections (Multiplier enhancement)
    if (currentY > pageHeight - margin - 140) {
      pageNum++;
      pdf.addPage();
      addPageHeader(pdf, scenarioLabel);
      currentY = margin + 22;
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(COLORS.darkGreen[0], COLORS.darkGreen[1], COLORS.darkGreen[2]);
    pdf.text('EU Taxonomy Alignment', margin, currentY);
    currentY += 8;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    const taxonomy = portfolioData.taxonomyAlignment || { aligned: 0, partiallyAligned: 0, notAligned: 0 };
    pdf.text(`Aligned: ${taxonomy.aligned}% — Partially aligned: ${taxonomy.partiallyAligned}% — Not aligned: ${taxonomy.notAligned}%`, margin, currentY);
    currentY += 10;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text('Double Materiality Summary', margin, currentY);
    currentY += 8;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    const dm = portfolioData.doubleMateriality || { financial: 'N/A', environmental: 'N/A', social: 'N/A' };
    pdf.text(`Financial materiality: ${dm.financial}`, margin, currentY);
    currentY += 5;
    pdf.text(`Environmental materiality: ${dm.environmental}`, margin, currentY);
    currentY += 5;
    pdf.text(`Social materiality: ${dm.social}`, margin, currentY);
    currentY += 10;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text('Audit Trail', margin, currentY);
    currentY += 8;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    const audit = portfolioData.auditTrail || [];
    if (audit.length === 0) {
      pdf.text('No audit events available for this export.', margin, currentY);
      currentY += 8;
    } else {
      audit.slice(0, 10).forEach((evt: any) => {
        pdf.text(`- ${format(new Date(evt.timestamp), 'yyyy-MM-dd HH:mm')} | ${evt.user || 'system'} | ${evt.action}`, margin, currentY);
        currentY += 5;
        if (currentY > pageHeight - margin - 20) {
          pageNum++;
          pdf.addPage();
          addPageHeader(pdf, scenarioLabel);
          currentY = margin + 22;
        }
      });
    }

    const totalPages = pdf.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      addPageFooter(pdf, i, totalPages);
    }

    const fileName = `GreenGauge_CSRD_Report_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`;
    pdf.save(fileName);

    logger.info(`✓ PDF generated successfully: ${fileName}`);
  } catch (error) {
    logger.error('❌ PDF generation failed:', error);
    throw new Error(
      `Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
