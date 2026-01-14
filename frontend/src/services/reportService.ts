import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { logger } from '@/lib/logger';

interface PortfolioData {
  loans?: any[];
  totalLoans?: number;
  totalPortfolioValue?: number;
  breachedLoans?: number;
  atRiskLoans?: number;
  avgRiskScore?: number;
}

export async function generatePDF(reportType: string, scenarioLabel: string, portfolioData: PortfolioData) {
  try {
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 25.4; // 1 inch

    // Cover page
    pdf.setFillColor(32, 201, 151);
    pdf.rect(0, 0, pageWidth, 30, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(22);
    pdf.setTextColor(255, 255, 255);
    pdf.text(reportType, pageWidth / 2, 18, { align: 'center' });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, margin, 50);
    pdf.text(`Scenario: ${scenarioLabel}`, margin, 58);

    pdf.addPage();

    // Executive Summary
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Executive Summary', margin, 20);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');

    const kpis = [
      { label: 'Total Portfolio (€M)', value: (portfolioData.totalPortfolioValue ?? 0).toFixed(1) },
      { label: 'Avg Risk Score', value: String(Math.round(portfolioData.avgRiskScore ?? 0)) },
      { label: 'Compliance Rate', value: `${Math.max(0, 100 - ((portfolioData.breachedLoans ?? 0) + (portfolioData.atRiskLoans ?? 0)))}%` },
      { label: 'Loans Breached', value: String(portfolioData.breachedLoans ?? 0) },
    ];

    let y = 32;
    kpis.forEach((k, i) => {
      const x = margin + (i % 2) * 80;
      if (i > 0 && i % 2 === 0) y += 18;
      pdf.setFillColor(245, 245, 245);
      pdf.rect(x, y, 70, 14, 'F');
      pdf.setFontSize(8);
      pdf.text(k.label, x + 3, y + 5);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(String(k.value), x + 3, y + 12);
      pdf.setFont('helvetica', 'normal');
    });

    y += 28;

    // Portfolio Table (simple, first 20 rows)
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Portfolio Overview', margin, y);
    y += 6;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');

    const loans = portfolioData.loans || [];
    const headers = ['Company', 'Sector', 'Exposure (€M)', 'Risk', 'Status', 'Days'];
    const colX = [margin, margin + 50, margin + 120, margin + 155, margin + 185, margin + 215];
    pdf.setFont('helvetica', 'bold');
    headers.forEach((h, i) => pdf.text(h, colX[i], y));
    y += 6;
    pdf.setFont('helvetica', 'normal');

    const rowsPerPage = 20;
    for (let i = 0; i < Math.min(loans.length, rowsPerPage); i++) {
      const row = loans[i];
      const exposure = ((row.loanAmount ?? row.amount ?? 0) / 1000000).toFixed(2);
      pdf.text(String(row.companyName ?? row.company ?? 'Unknown'), colX[0], y);
      pdf.text(String(row.sector ?? ''), colX[1], y);
      pdf.text(exposure, colX[2], y);
      pdf.text(String(Math.round(row.riskScore?.overall ?? row.riskScore ?? 0)), colX[3], y);
      pdf.text(String(row.status ?? ''), colX[4], y);
      pdf.text(String(row.daysToBreach ?? ''), colX[5], y);
      y += 6;
      if (y > pdf.internal.pageSize.getHeight() - margin - 20) {
        pdf.addPage();
        y = margin;
      }
    }

    // Footer
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`Page ${i} of ${pageCount} | Generated ${format(new Date(), 'yyyy-MM-dd HH:mm')} | CONFIDENTIAL`, margin, pdf.internal.pageSize.getHeight() - 10);
    }

    // Save
    const fileName = `GreenGauge_${reportType.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
    pdf.save(fileName);
    return { ok: true, fileName };
  } catch (err) {
    logger.error('generatePDF error', err);
    throw err;
  }
}

export default { generatePDF };

// Re-export utilities implemented in the JS fallback module so UI can import
// higher-level helpers (useReportService, renderReportHtml, etc.) consistently
// across the codebase. The JS file contains richer implementations and is
// used as the single source of truth for report rendering utilities.
// Note: Higher-level helpers are provided by the JS implementation at `reportService.js`.
// Import them directly where needed (e.g. import { useReportService } from '@/services/reportService.js').
