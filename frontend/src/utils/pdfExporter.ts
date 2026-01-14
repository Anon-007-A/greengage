/**
 * PDF Exporter Utility
 * Generates professional CSRD compliance reports with portfolio data, charts, and metrics
 */

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { logger } from '@/lib/logger';
import { format } from 'date-fns';

// Extend jsPDF type to include autoTable method
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

// jspdf-autotable is imported statically above; mark available
let AUTO_TABLE_AVAILABLE = true;
async function tryInitAutoTable() {
  // no-op when statically imported
  return true;
}

function renderTableFallback(pdf: jsPDF, startY: number, margin: number, head: string[], body: string[][]) {
  let y = startY;
  const pageHeight = pdf.internal.pageSize.getHeight();
  const lineHeight = 6;
  // header
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text(head.join('   |   '), margin, y);
  y += lineHeight;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  body.forEach((row) => {
    if (y > pageHeight - 30) { pdf.addPage(); y = margin; }
    pdf.text(row.join(' | '), margin, y);
    y += lineHeight;
  });
  return y + 10;
}

// Type definitions for portfolio data
export interface PortfolioDataExport {
  totalLoans: number;
  totalPortfolioValue: number; // in EUR millions
  breachedLoans: number;
  atRiskLoans: number;
  totalBreaches: number;
  portfolioGreenScore: number; // 0-100
  avgRiskScore: number; // 0-100
  esgResilience: number; // 0-100
  co2Reduced: number; // in thousands of tons
  cleanEnergyGWh: number; // in GWh
  loans: LoanDataExport[];
  breachedLoanDetails: BreachDetailExport[];
  atRiskLoanDetails: RiskDetailExport[];
  portfolioHeatIndex: number; // 0-100
  complianceStatus: ComplianceItemExport[];
  darkGreenCount: number;
  lightGreenCount: number;
  transitionCount: number;
}

export interface LoanDataExport {
  id: string;
  company: string;
  sector: string;
  amount: number; // in EUR millions
  status: 'Safe' | 'At Risk' | 'Breached';
  esgRating: 'Dark Green' | 'Light Green' | 'Transition';
  riskScore: number;
  covenant?: string;
}

export interface BreachDetailExport {
  company: string;
  covenant: string;
  stressedValue: number;
  threshold: number;
  severity: number;
  action: string;
}

export interface RiskDetailExport {
  company: string;
  covenant: string;
  stressedValue: number;
  threshold: number;
  cushion: number;
}

export interface ComplianceItemExport {
  name: string;
  status: 'Complete' | 'Pending' | 'In Progress';
}

/**
 * Main function to export portfolio data to a professional PDF
 * @param portfolioData - Portfolio metrics and loan data
 * @param scenarioLabel - Description of the stress scenario
 */
export async function exportPortfolioToPDF(
  portfolioData: PortfolioDataExport,
  scenarioLabel: string = 'Baseline'
): Promise<void> {
  try {
    // ensure autoTable if available
    await tryInitAutoTable();
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Set PDF properties for metadata
    pdf.setProperties({
      title: 'GreenGauge CSRD Compliance Report',
      subject: 'Loan Portfolio Covenant & ESG Analysis',
      author: 'GreenGauge | LMA Intelligence',
      keywords: 'CSRD, Covenants, ESG, Loans, Syndicated',
      creator: 'GreenGauge',
    });

    const pageHeight = pdf.internal.pageSize.getHeight();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 15;
    let currentY = margin;

    // ========== PAGE 1: COVER & SUMMARY ==========
    addCoverPage(pdf, pageWidth, pageHeight, margin, scenarioLabel, portfolioData);

    // Add new page for content
    pdf.addPage();
    currentY = margin;

    // ========== KPI SECTION ==========
    currentY = addKPISection(pdf, pageWidth, pageHeight, margin, currentY, portfolioData);

    // ========== LOAN PORTFOLIO TABLE ==========
    currentY = addLoanPortfolioTable(pdf, pageWidth, pageHeight, margin, currentY, portfolioData);

    // ========== BREACH DETAILS SECTION ==========
    if (portfolioData.breachedLoanDetails.length > 0) {
      currentY = addBreachDetailsSection(pdf, pageWidth, pageHeight, margin, currentY, portfolioData);
    }

    // ========== AT-RISK LOANS SECTION ==========
    if (portfolioData.atRiskLoanDetails.length > 0) {
      currentY = addAtRiskLoansSection(pdf, pageWidth, pageHeight, margin, currentY, portfolioData);
    }

    // ========== ESG & RESILIENCE SECTION ==========
    currentY = addESGResilienceSection(pdf, pageWidth, pageHeight, margin, currentY, portfolioData);

    // ========== COMPLIANCE CHECKLIST ==========
    if (portfolioData.complianceStatus.length > 0) {
      addComplianceChecklistPage(pdf, pageWidth, pageHeight, margin, portfolioData);
    }

    // Save PDF
    pdf.save(`GreenGauge_CSRD_Report_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`);
  } catch (error) {
    logger.error('Error exporting PDF:', error);
    throw error;
  }
}

/**
 * Add cover page with title, date, and executive summary
 */
function addCoverPage(
  pdf: jsPDF,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  scenarioLabel: string,
  portfolioData: PortfolioDataExport
) {
  let currentY = 50;

  // Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(28);
  pdf.setTextColor(76, 175, 80); // Green
  pdf.text('GreenGauge', margin, currentY);

  // Subtitle
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(14);
  pdf.setTextColor(100, 100, 100);
  pdf.text('CSRD Compliance & Covenant Risk Report', margin, currentY + 12);

  currentY += 35;

  // Metadata box
  pdf.setDrawColor(76, 175, 80);
  pdf.setLineWidth(1);
  pdf.rect(margin, currentY, pageWidth - 2 * margin, 35);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);

  const metadataLines = [
    `Generated: ${format(new Date(), 'MMMM d, yyyy - HH:mm')}`,
    `Scenario: ${scenarioLabel}`,
    `Portfolio Value: €${portfolioData.totalPortfolioValue.toFixed(1)}M`,
    `Total Loans: ${portfolioData.totalLoans}`,
  ];

  let metaY = currentY + 6;
  metadataLines.forEach((line) => {
    pdf.text(line, margin + 5, metaY);
    metaY += 6;
  });

  currentY += 45;

  // Executive Summary
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text('Executive Summary', margin, currentY);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(50, 50, 50);

  currentY += 10;

  const summaryText = [
    `This report provides a comprehensive analysis of the syndicated loan portfolio as of ${format(new Date(), 'MMMM d, yyyy')}.`,
    ``,
    `Portfolio Highlights:`,
    `• Total Portfolio Value: €${portfolioData.totalPortfolioValue.toFixed(1)}M across ${portfolioData.totalLoans} loans`,
    `• Covenant Status: ${portfolioData.breachedLoans} breached, ${portfolioData.atRiskLoans} at risk`,
    `• Portfolio Heat Index: ${portfolioData.portfolioHeatIndex}/100 (${getHeatIndexLevel(portfolioData.portfolioHeatIndex)})`,
    `• ESG Resilience Score: ${portfolioData.esgResilience}/100`,
    `• Portfolio Green Score: ${portfolioData.portfolioGreenScore}/100`,
    `• Environmental Impact: ${portfolioData.co2Reduced}K tons CO₂ reduced, ${portfolioData.cleanEnergyGWh} GWh generated`,
    ``,
    `This report includes detailed covenant breach analysis, loan-level metrics, ESG classification,`,
    `and regulatory compliance assessment under the CSRD framework.`,
  ];

  summaryText.forEach((line) => {
    if (currentY > pageHeight - 30) {
      pdf.addPage();
      currentY = margin;
    }
    pdf.text(line, margin, currentY);
    currentY += 6;
  });
}

/**
 * Add KPI section with metrics table
 */
function addKPISection(
  pdf: jsPDF,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  startY: number,
  portfolioData: PortfolioDataExport
): number {
  let currentY = startY;

  // Check if we need a new page
  if (currentY > pageHeight - 100) {
    pdf.addPage();
    currentY = margin;
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(76, 175, 80);
  pdf.text('Key Performance Indicators', margin, currentY);
  pdf.setTextColor(0, 0, 0);

  currentY += 8;

  // Create KPI table data
  const kpiData = [
    ['Metric', 'Value', 'Status'],
    ['Portfolio Value', `€${portfolioData.totalPortfolioValue.toFixed(1)}M`, 'Active'],
    ['Green Score', `${portfolioData.portfolioGreenScore}/100`, getScoreStatus(portfolioData.portfolioGreenScore)],
    ['Avg Risk Score', `${portfolioData.avgRiskScore}/100`, getRiskStatus(portfolioData.avgRiskScore)],
    ['Heat Index', `${portfolioData.portfolioHeatIndex}/100`, getHeatIndexLevel(portfolioData.portfolioHeatIndex)],
    ['Total Breaches', portfolioData.totalBreaches.toString(), portfolioData.totalBreaches > 0 ? 'Alert' : 'Safe'],
    ['ESG Resilience', `${portfolioData.esgResilience}/100`, getResilienceStatus(portfolioData.esgResilience)],
    ['CO₂ Reduced', `${portfolioData.co2Reduced}K tons`, 'Strong'],
    ['Clean Energy', `${portfolioData.cleanEnergyGWh} GWh`, 'Strong'],
  ];

  if (AUTO_TABLE_AVAILABLE && (pdf as any).autoTable) {
    (pdf as any).autoTable({
      head: [kpiData[0]],
      body: kpiData.slice(1),
      startY: currentY,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: {
        fillColor: [76, 175, 80],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 10,
      },
      bodyStyles: {
        textColor: 50,
        fontSize: 9,
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 50 },
        2: { cellWidth: 40 },
      },
    });
    return (pdf as any).lastAutoTable.finalY + 15;
  }

  // fallback
  const yAfter = renderTableFallback(pdf, currentY, margin, kpiData[0], kpiData.slice(1));
  return yAfter;
}

/**
 * Add loan portfolio table
 */
function addLoanPortfolioTable(
  pdf: jsPDF,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  startY: number,
  portfolioData: PortfolioDataExport
): number {
  let currentY = startY;

  // Check if we need a new page
  if (currentY > pageHeight - 80) {
    pdf.addPage();
    currentY = margin;
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(76, 175, 80);
  pdf.text('Loan Portfolio Summary', margin, currentY);
  pdf.setTextColor(0, 0, 0);

  currentY += 8;

  const loanTableData = [
    ['Company', 'Sector', 'Amount (€M)', 'Status', 'ESG', 'Risk Score'],
    ...portfolioData.loans.map((loan) => [
      loan.company,
      loan.sector,
      `${loan.amount.toFixed(1)}`,
      loan.status,
      loan.esgRating,
      `${loan.riskScore}`,
    ]),
  ];

  if (AUTO_TABLE_AVAILABLE && (pdf as any).autoTable) {
    (pdf as any).autoTable({
      head: [loanTableData[0]],
      body: loanTableData.slice(1),
      startY: currentY,
      margin: { left: margin, right: margin },
      theme: 'striped',
      headStyles: {
        fillColor: [76, 175, 80],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        textColor: 50,
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 45 },
        2: { cellWidth: 28 },
        3: { cellWidth: 22 },
        4: { cellWidth: 30 },
        5: { cellWidth: 30 },
      },
    });
    return (pdf as any).lastAutoTable.finalY + 15;
  }

  return renderTableFallback(pdf, currentY, margin, loanTableData[0], loanTableData.slice(1));
}

/**
 * Add breach details section
 */
function addBreachDetailsSection(
  pdf: jsPDF,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  startY: number,
  portfolioData: PortfolioDataExport
): number {
  let currentY = startY;

  // Check if we need a new page
  if (currentY > pageHeight - 80) {
    pdf.addPage();
    currentY = margin;
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(220, 50, 50);
  pdf.text(`Covenant Breaches (${portfolioData.breachedLoanDetails.length})`, margin, currentY);
  pdf.setTextColor(0, 0, 0);

  currentY += 8;

  const breachTableData = [
    ['Company', 'Covenant', 'Current Value', 'Threshold', 'Severity', 'Recommended Action'],
    ...portfolioData.breachedLoanDetails.map((breach) => [
      breach.company,
      breach.covenant,
      breach.stressedValue.toFixed(2),
      breach.threshold.toFixed(2),
      `${breach.severity}%`,
      breach.action.substring(0, 30) + (breach.action.length > 30 ? '...' : ''),
    ]),
  ];

  if (AUTO_TABLE_AVAILABLE && (pdf as any).autoTable) {
    (pdf as any).autoTable({
      head: [breachTableData[0]],
      body: breachTableData.slice(1),
      startY: currentY,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: {
        fillColor: [220, 50, 50],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        textColor: 50,
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 35 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 20 },
        5: { cellWidth: 50 },
      },
    });
    return (pdf as any).lastAutoTable.finalY + 15;
  }

  return renderTableFallback(pdf, currentY, margin, breachTableData[0], breachTableData.slice(1));
}

/**
 * Add at-risk loans section
 */
function addAtRiskLoansSection(
  pdf: jsPDF,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  startY: number,
  portfolioData: PortfolioDataExport
): number {
  let currentY = startY;

  // Check if we need a new page
  if (currentY > pageHeight - 80) {
    pdf.addPage();
    currentY = margin;
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(200, 150, 0);
  pdf.text(`At-Risk Loans - Within 10% of Threshold (${portfolioData.atRiskLoanDetails.length})`, margin, currentY);
  pdf.setTextColor(0, 0, 0);

  currentY += 8;

  const riskTableData = [
    ['Company', 'Covenant', 'Current Value', 'Threshold', 'Cushion %'],
    ...portfolioData.atRiskLoanDetails.map((risk) => [
      risk.company,
      risk.covenant,
      risk.stressedValue.toFixed(2),
      risk.threshold.toFixed(2),
      `${risk.cushion.toFixed(1)}%`,
    ]),
  ];

  if (AUTO_TABLE_AVAILABLE && (pdf as any).autoTable) {
    (pdf as any).autoTable({
      head: [riskTableData[0]],
      body: riskTableData.slice(1),
      startY: currentY,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: {
        fillColor: [255, 193, 7],
        textColor: 0,
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        textColor: 50,
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 45 },
        2: { cellWidth: 30 },
        3: { cellWidth: 30 },
        4: { cellWidth: 40 },
      },
    });
    return (pdf as any).lastAutoTable.finalY + 15;
  }

  return renderTableFallback(pdf, currentY, margin, riskTableData[0], riskTableData.slice(1));
}

/**
 * Add ESG & resilience section
 */
function addESGResilienceSection(
  pdf: jsPDF,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  startY: number,
  portfolioData: PortfolioDataExport
): number {
  let currentY = startY;

  // Check if we need a new page
  if (currentY > pageHeight - 100) {
    pdf.addPage();
    currentY = margin;
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(76, 175, 80);
  pdf.text('ESG Classification & Resilience Analysis', margin, currentY);
  pdf.setTextColor(0, 0, 0);

  currentY += 10;

  // ESG breakdown
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('Portfolio ESG Composition:', margin, currentY);

  currentY += 6;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  const esgText = [
    `• Dark Green Loans: ${portfolioData.darkGreenCount} (${((portfolioData.darkGreenCount / portfolioData.totalLoans) * 100).toFixed(1)}%)`,
    `• Light Green Loans: ${portfolioData.lightGreenCount} (${((portfolioData.lightGreenCount / portfolioData.totalLoans) * 100).toFixed(1)}%)`,
    `• Transition Loans: ${portfolioData.transitionCount} (${((portfolioData.transitionCount / portfolioData.totalLoans) * 100).toFixed(1)}%)`,
    ``,
    `Environmental Impact:`,
    `• CO₂ Emissions Reduced: ${portfolioData.co2Reduced}K tons per annum`,
    `• Clean Energy Generated: ${portfolioData.cleanEnergyGWh} GWh per annum`,
  ];

  esgText.forEach((line) => {
    if (currentY > pageHeight - 30) {
      pdf.addPage();
      currentY = margin;
    }
    pdf.text(line, margin, currentY);
    currentY += 5;
  });

  currentY += 5;

  // Resilience metrics
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('Covenant Resilience:', margin, currentY);

  currentY += 6;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  const resilienceText = [
    `• Portfolio Heat Index: ${portfolioData.portfolioHeatIndex}/100 - ${getHeatIndexLevel(portfolioData.portfolioHeatIndex)}`,
    `• ESG Resilience Score: ${portfolioData.esgResilience}/100 - ${getResilienceStatus(portfolioData.esgResilience)}`,
    `• Safe Loans: ${portfolioData.totalLoans - portfolioData.breachedLoans - portfolioData.atRiskLoans}/${portfolioData.totalLoans}`,
  ];

  resilienceText.forEach((line) => {
    if (currentY > pageHeight - 30) {
      pdf.addPage();
      currentY = margin;
    }
    pdf.text(line, margin, currentY);
    currentY += 5;
  });

  return currentY + 15;
}

/**
 * Add compliance checklist page
 */
function addComplianceChecklistPage(
  pdf: jsPDF,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  portfolioData: PortfolioDataExport
) {
  pdf.addPage();
  let currentY = margin;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(76, 175, 80);
  pdf.text('CSRD Compliance Checklist', margin, currentY);
  pdf.setTextColor(0, 0, 0);

  currentY += 12;

  const checklistData = [
    ['Item', 'Status', 'Completion Date'],
    ...portfolioData.complianceStatus.map((item) => [
      item.name,
      item.status,
      format(new Date(), 'MMM dd, yyyy'),
    ]),
  ];

  if (AUTO_TABLE_AVAILABLE && (pdf as any).autoTable) {
    (pdf as any).autoTable({
      head: [checklistData[0]],
      body: checklistData.slice(1),
      startY: currentY,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: {
        fillColor: [76, 175, 80],
        textColor: 255,
        fontStyle: 'bold',
      },
      bodyStyles: {
        textColor: 50,
      },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { cellWidth: 35 },
        2: { cellWidth: 35 },
      },
    });

    // Add footer with disclaimer
    currentY = (pdf as any).lastAutoTable.finalY + 20;
  } else {
    currentY = renderTableFallback(pdf, currentY, margin, checklistData[0], checklistData.slice(1));
  }

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(150, 150, 150);

  const disclaimerText = [
    'This report was generated automatically by GreenGauge | LMA Intelligence.',
    'It contains confidential and proprietary information. The data represents',
    'the portfolio state at the time of generation and should be reviewed for accuracy.',
  ];

  disclaimerText.forEach((line, idx) => {
    pdf.text(line, margin, pageHeight - 15 + idx * 3);
  });
}

/**
 * Helper functions for status labels
 */
function getScoreStatus(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Poor';
}

function getRiskStatus(score: number): string {
  if (score <= 30) return 'Low Risk';
  if (score <= 50) return 'Moderate Risk';
  if (score <= 70) return 'High Risk';
  return 'Critical Risk';
}

function getHeatIndexLevel(index: number): string {
  if (index < 20) return 'Safe';
  if (index < 40) return 'Caution';
  if (index < 60) return 'Elevated';
  if (index < 80) return 'Alert';
  return 'Critical';
}

function getResilienceStatus(score: number): string {
  if (score >= 80) return 'Strong';
  if (score >= 60) return 'Moderate';
  if (score >= 40) return 'Vulnerable';
  return 'Critical';
}

/**
 * Export a compact Benchmark Comparison PDF (3 pages)
 * Pages: Executive Summary, Detailed Metrics, Insights & Recommendations
 */
export function exportBenchmarkComparisonPDF(
  portfolio: { riskScore: number; esgScore: number; complianceRate: number; totalLoans: number },
  industry: { riskScore: number; esgScore: number; complianceRate: number },
  globalSector: { riskScore: number; esgScore: number; complianceRate: number }
) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 15;

  // Metadata / cover
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  pdf.setTextColor(6, 167, 125);
  pdf.text('GreenGauge', margin, 28);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(12);
  pdf.setTextColor(40, 40, 40);
  pdf.text('Benchmark Comparison Report', margin, 38);

  pdf.setFontSize(9);
  pdf.text(`Generated: ${format(new Date(), 'MMMM d, yyyy - HH:mm')}`, margin, 46);

  // Executive summary box
  pdf.setDrawColor(6, 167, 125);
  pdf.rect(margin, 52, pageWidth - margin * 2, 30);
  pdf.setFontSize(11);
  pdf.setTextColor(0, 0, 0);
  pdf.text('Executive Summary', margin + 2, 58);
  pdf.setFontSize(9);
  const diffRisk = Math.round(((industry.riskScore - portfolio.riskScore) / Math.max(1, industry.riskScore)) * 100);
  const diffESG = Math.round(((portfolio.esgScore - industry.esgScore) / Math.max(1, industry.esgScore)) * 100);
  const diffComp = Math.round(((portfolio.complianceRate - industry.complianceRate) / Math.max(1, industry.complianceRate)) * 100);

  const lines = [
    `Portfolio vs Industry comparison for ${portfolio.totalLoans} loans.`,
    `Key metrics: Risk Score, ESG Score, Compliance Rate.`,
    `Portfolio Risk Score: ${portfolio.riskScore} vs Industry: ${industry.riskScore}`,
    `Portfolio ESG Score: ${portfolio.esgScore} vs Industry: ${industry.esgScore}`,
    `Portfolio Compliance: ${portfolio.complianceRate}% vs Industry: ${industry.complianceRate}%`,
  ];

  let y = 66;
  pdf.setFont('helvetica', 'normal');
  lines.forEach((l) => {
    pdf.text(l, margin + 4, y);
    y += 5;
  });

  // Small side-by-side bars visual
  const chartY = 110;
  const barLeft = margin + 10;
  const barWidth = pageWidth - margin * 2 - 20;
  const labels = ['Risk Score', 'ESG Score', 'Compliance'];
  const pvals = [portfolio.riskScore, portfolio.esgScore, portfolio.complianceRate];
  const ivals = [industry.riskScore, industry.esgScore, industry.complianceRate];

  pdf.setFontSize(9);
  labels.forEach((label, i) => {
    const rowY = chartY + i * 14;
    pdf.text(label, margin + 4, rowY + 4);
    // industry bar (bg)
    const iv = Math.max(0, Math.min(100, ivals[i]));
    const iw = (iv / 100) * (barWidth - 80);
    pdf.setFillColor(200, 200, 200);
    pdf.rect(barLeft + 40, rowY - 2, barWidth - 80, 8, 'F');
    // industry value
    pdf.setFillColor(150, 150, 150);
    pdf.rect(barLeft + 40, rowY - 2, iw, 8, 'F');
    pdf.setTextColor(150, 150, 150);
    pdf.text(String(ivals[i]), barLeft + barWidth - 28, rowY + 4);

    // portfolio bar (overlay)
    const pv = Math.max(0, Math.min(100, pvals[i]));
    const pw = (pv / 100) * (barWidth - 80);
    pdf.setFillColor(6, 167, 125);
    pdf.rect(barLeft + 40, rowY + 8, pw, 8, 'F');
    pdf.setTextColor(6, 167, 125);
    pdf.text(String(pvals[i]), barLeft + barWidth - 28, rowY + 12);
  });

  // Page 2: Detailed Metrics
  pdf.addPage();
  pdf.setFontSize(14);
  pdf.setTextColor(6, 167, 125);
  pdf.text('Detailed Metrics', margin, 28);
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);

  const tableStartY = 42;
  const table = [
    ['Metric', 'Your Portfolio', 'Industry Avg', 'Global Sector', 'Diff'],
    ['Risk Score', String(portfolio.riskScore), String(industry.riskScore), String(globalSector.riskScore), `${industry.riskScore - portfolio.riskScore >= 0 ? '+' : ''}${(industry.riskScore - portfolio.riskScore).toString()}`],
    ['ESG Score', String(portfolio.esgScore), String(industry.esgScore), String(globalSector.esgScore), `${diffESG >= 0 ? '+' : ''}${diffESG}%`],
    ['Compliance Rate', `${portfolio.complianceRate}%`, `${industry.complianceRate}%`, `${globalSector.complianceRate}%`, `${diffComp >= 0 ? '+' : ''}${diffComp}%`],
  ];

  if (AUTO_TABLE_AVAILABLE && (pdf as any).autoTable) {
    (pdf as any).autoTable({
      startY: tableStartY,
      head: [table[0]],
      body: table.slice(1),
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: { fillColor: [6, 167, 125], textColor: 255 },
      bodyStyles: { fontSize: 10 },
    });
  } else {
    renderTableFallback(pdf, tableStartY, margin, table[0], table.slice(1));
  }

  // Page 3: Insights & Recommendations
  pdf.addPage();
  pdf.setFontSize(14);
  pdf.setTextColor(6, 167, 125);
  pdf.text('Insights & Recommendations', margin, 28);
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);

  const insights = [
    `Your portfolio is ${Math.abs(diffRisk)}% ${diffRisk > 0 ? 'lower' : 'higher'} breach risk than industry`,
    `ESG performance ${Math.abs(diffESG)}% ${diffESG > 0 ? 'above' : 'below'} industry average - competitive ${diffESG > 0 ? 'advantage' : 'gap'}`,
    `Compliance rate ${Math.abs(diffComp)}% ${diffComp > 0 ? 'better' : 'worse'} than industry`,
    `Next steps: Monitor At-Risk loans closely; schedule quarterly ESG reviews; engage with syndicate on top exposures.`,
  ];

  let iy = 40;
  insights.forEach((l) => {
    pdf.text(`• ${l}`, margin + 2, iy);
    iy += 8;
  });

  // Footer
  const foot = `GreenGauge | Covenant Monitoring & ESG Analytics`;
  pdf.setFontSize(8);
  pdf.setTextColor(120, 120, 120);
  pdf.text(foot, margin, pdf.internal.pageSize.getHeight() - 10);

  const filename = `greengauge_benchmark_comparison_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
  pdf.save(filename);
}
