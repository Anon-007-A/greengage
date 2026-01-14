import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { usePortfolio } from '@/contexts/PortfolioContext';
import * as extractors from './reportDataExtractors';
import { logger } from '@/lib/logger';

// v1.0 data fallback generator (keeps reports working if context unavailable)
import { createSeededRng } from '@/lib/seededRng';
const sampleNames = ['AgriNova', 'BatteryCo', 'Solaris Energy', 'RiverBank Holdings', 'GreenFarms', 'UrbanGrid', 'EcoTrans', 'HarvestFoods', 'NordicWind', 'BlueSteel Inc'];
const makeMockPortfolio = () => {
  // deterministic RNG seeded for reproducible mock data
  const rng = createSeededRng('GreenGauge123');
  const loans = Array.from({ length: 150 }).map((_, i) => ({
    id: `L-${i + 1}`,
    companyName: sampleNames[i % sampleNames.length] + ` ${Math.ceil((i+1)/sampleNames.length)}`,
    sector: ['Energy', 'Agriculture', 'Transport', 'Construction', 'Technology'][i % 5],
    exposure: +((rng() * 100).toFixed(1)),
    loanAmount: +((rng() * 200).toFixed(1)),
    riskScore: Math.round(rng() * 100),
    status: rng() > 0.85 ? 'breached' : (rng() > 0.7 ? 'at_risk' : 'compliant'),
    daysToBreach: Math.floor(rng() * 120),
    esg: { environmental: Math.round(rng() * 100), social: Math.round(rng() * 100), governance: Math.round(rng() * 100) }
  }));

  const totalPortfolioValue = loans.reduce((s, l) => s + (l.loanAmount || 0), 0);
  const avgRiskScore = Math.round(loans.reduce((s, l) => s + (l.riskScore || 0), 0) / loans.length);
  const complianceRate = Math.round((loans.filter(l => l.status === 'compliant').length / loans.length) * 1000) / 10;

  const esgScores = {
    environmental: Math.round(loans.reduce((s, l) => s + (l.esg.environmental || 0), 0) / loans.length),
    social: Math.round(loans.reduce((s, l) => s + (l.esg.social || 0), 0) / loans.length),
    governance: Math.round(loans.reduce((s, l) => s + (l.esg.governance || 0), 0) / loans.length)
  };

  const covenantTypeDistribution = { 'Debt-to-EBITDA': 40, 'DSCR': 60, 'Interest Coverage': 30 };

  return {
    loans,
    totalPortfolioValue,
    avgRiskScore,
    complianceRate,
    breachedLoans: loans.filter(l => l.status === 'breached').length,
    atRiskLoans: loans.filter(l => l.status === 'at_risk').length,
    safeLoans: loans.filter(l => l.status === 'compliant').length,
    esgScores,
    covenantTypeDistribution
  };
};

// Expose a hook that binds to context if used within React components
export function useReportService() {
  const portfolio = usePortfolio();

  const getPortfolioData = () => {
    try {
        if (portfolio && portfolio.loans && portfolio.loans.length > 0) {
        const loans = portfolio.loans.map(l => ({
          id: l.id ?? l.loanId ?? l.externalId ?? ((l.companyName || l.name || 'unknown').toString().toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'')),
          companyName: l.companyName || l.name || l.borrower || 'Unknown',
          sector: l.sector || 'Unknown',
          loanAmount: (l.loanAmount ?? l.amount ?? 0),
          riskScore: typeof l.riskScore === 'number' ? l.riskScore : (l.riskScore?.overall ?? 0),
          status: l.status || 'active',
          daysToBreach: l.daysToBreach ?? l.daysToBreachBaseline ?? null,
          esg: l.esg || { environmental: 0, social: 0, governance: 0 }
        }));

        const totalPortfolioValue = loans.reduce((s, it) => s + (it.loanAmount || 0), 0);
        const avgRiskScore = loans.length ? Math.round(loans.reduce((s, it) => s + (it.riskScore || 0), 0) / loans.length) : 0;
        const complianceRate = loans.length ? Math.round((loans.filter(l => l.status === 'compliant' || l.status === 'active').length / loans.length) * 1000) / 10 : 0;

        const esgScores = {
          environmental: Math.round(loans.reduce((s, l) => s + (l.esg.environmental || 0), 0) / Math.max(1, loans.length)),
          social: Math.round(loans.reduce((s, l) => s + (l.esg.social || 0), 0) / Math.max(1, loans.length)),
          governance: Math.round(loans.reduce((s, l) => s + (l.esg.governance || 0), 0) / Math.max(1, loans.length))
        };

        const covenantTypeDistribution = {};
        // Attempt to infer covenant distribution from loan metadata
        loans.forEach(l => {
          const t = (l.covenantType || ((l.covenants && l.covenants[0] && l.covenants[0].type) || 'Other'));
          covenantTypeDistribution[t] = (covenantTypeDistribution[t] || 0) + 1;
        });

        return {
          loans,
          totalPortfolioValue,
          avgRiskScore,
          complianceRate,
          breachedLoans: loans.filter(l => l.status === 'breached' || l.status === 'default').length,
          atRiskLoans: loans.filter(l => /risk|watch|warning/i.test(String(l.status))).length,
          safeLoans: loans.filter(l => /active|compliant/i.test(String(l.status))).length,
          esgScores,
          covenantTypeDistribution
        };
      }
    } catch (e) {
      logger.error('Error reading portfolio context', e);
    }
    return makeMockPortfolio();
  };

  const calculateReportMetrics = (portfolioData, reportType = 'analytics', scenarioParams = {}) => {
    const loans = (portfolioData && portfolioData.loans) || [];
    const metrics = { reportType, generatedAt: new Date(), loanCount: loans.length };

    if (reportType === 'compliance' || reportType === 'covenant') {
      metrics.breached = loans.filter(l => l.status === 'breached' || l.status === 'default');
      metrics.atRisk = loans.filter(l => /risk|watch|warning/i.test(String(l.status)));
      metrics.daysToBreach = metrics.breached.map(l => ({ company: l.companyName, days: l.daysToBreach || 0 }));
    }

    if (reportType === 'analytics' || reportType === 'portfolio') {
      // simple sector aggregates and 3-month historical mock trend
      const sectors = {};
      loans.forEach(l => {
        const s = l.sector || 'Unknown';
        sectors[s] = sectors[s] || { totalExposure: 0, avgRisk: 0, count: 0, trend: '→' };
        sectors[s].totalExposure += (l.loanAmount || 0);
        sectors[s].avgRisk += (l.riskScore || 0);
        sectors[s].count += 1;
      });
      Object.keys(sectors).forEach(k => { sectors[k].avgRisk = Math.round(sectors[k].avgRisk / sectors[k].count); });
      metrics.sectorPerformance = sectors;
      metrics.historical = ['month1', 'month2', 'month3'].map((m, i) => ({ month: i + 1, avgRisk: Math.round(Math.max(0, portfolioData.avgRiskScore - i * 2)), compliantPct: Math.round(portfolioData.complianceRate - i * 1.5), breachedCount: Math.max(0, Math.round(portfolioData.breachedLoans + i)) }));
    }

    if (reportType === 'risk') {
      const buckets = { '0-20': [], '20-40': [], '40-60': [], '60-80': [], '80-100': [] };
      loans.forEach(l => {
        const r = l.riskScore || 0;
        if (r <= 20) buckets['0-20'].push(l);
        else if (r <= 40) buckets['20-40'].push(l);
        else if (r <= 60) buckets['40-60'].push(l);
        else if (r <= 80) buckets['60-80'].push(l);
        else buckets['80-100'].push(l);
      });
      metrics.riskDistribution = Object.keys(buckets).map(k => ({ bucket: k, count: buckets[k].length, pct: Math.round((buckets[k].length / loans.length) * 1000) / 10, companies: buckets[k].slice(0, 10).map(l => l.companyName) }));
      metrics.top10 = loans.slice().sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0)).slice(0, 10);
    }

    if (reportType === 'stress') {
      const { ebitdaDrop = 0, rateHike = 0 } = scenarioParams;
      // simple stress impact calculation — increase risk by factors
      const stressed = loans.map(l => ({ ...l, stressedRisk: Math.min(100, Math.round((l.riskScore || 0) + (ebitdaDrop * 0.8) + (rateHike / 10) * 0.5)) }));
      metrics.baseline = { breached: portfolioData.breachedLoans, atRisk: portfolioData.atRiskLoans, avgRisk: portfolioData.avgRiskScore };
      metrics.stressed = { breached: stressed.filter(l => l.stressedRisk >= 80).length, atRisk: stressed.filter(l => l.stressedRisk >= 30 && l.stressedRisk < 80).length, avgRisk: Math.round(stressed.reduce((s, l) => s + l.stressedRisk, 0) / Math.max(1, stressed.length)) };
      metrics.impact = { ebitdaDrop, rateHike };
      metrics.topAffected = stressed.sort((a, b) => b.stressedRisk - a.stressedRisk).slice(0, 15);
    }

    if (reportType === 'environmental' || reportType === 'esg') {
      metrics.esg = portfolioData.esgScores || { environmental: 0, social: 0, governance: 0 };
      metrics.greenLoanCount = loans.filter(l => (l.isGreen || (l.esg && (l.esg.environmental || 0) > 60))).length;
      metrics.greenLoanValue = loans.filter(l => (l.isGreen || (l.esg && (l.esg.environmental || 0) > 60))).reduce((s, l) => s + (l.loanAmount || 0), 0);
      metrics.co2Reduction = Math.round(metrics.greenLoanValue * 0.02 * 100) / 100;
      metrics.sdgs = { 7: Math.round(metrics.greenLoanCount * 0.3), 12: Math.round(metrics.greenLoanCount * 0.2), 13: Math.round(metrics.greenLoanCount * 0.5) };
    }

    if (reportType === 'executive') {
      metrics.summary = {
        totalValue: portfolioData.totalPortfolioValue,
        avgRiskScore: portfolioData.avgRiskScore,
        complianceRate: portfolioData.complianceRate,
        topRisks: loans.slice().sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0)).slice(0, 3).map(l => ({ company: l.companyName, score: l.riskScore })),
        opportunities: loans.slice().filter(l => (l.esg && l.esg.environmental > 70)).slice(0, 3).map(l => ({ company: l.companyName, esg: l.esg }))
      };
    }

    return metrics;
  };

  const generatePDF = async (reportType, portfolioData, metrics, scenarioParams = {}) => {
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 25.4; // 1 inch in mm

      // Cover page
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      // Logo placeholder (top center)
      const titleY = 60;
      doc.setFontSize(48);
      doc.setTextColor(32, 201, 151);
      const title = (() => {
        switch (reportType) {
          case 'compliance': return 'Covenant Compliance Report';
          case 'analytics': return 'Portfolio Analytics Report';
          case 'risk': return 'Risk Assessment Report';
          case 'stress': return 'Stress Test Results Report';
          case 'environmental': return 'Environmental Impact Report';
          case 'executive': return 'Executive Summary Report';
          default: return `${reportType} Report`;
        }
      })();

      // Center title
      const titleWidth = (doc.getTextWidth ? doc.getTextWidth(title) : title.length * 1.8) * (doc.getFontSize() / 11);
      doc.text(title, pageWidth / 2, titleY, { align: 'center' });
      addHeader(title);

      // Date/time
      doc.setFontSize(14);
      doc.setTextColor(108, 117, 125);
      const dateStr = `Generated on: ${format(new Date(), 'dd LLL yyyy, hh:mm a')}`;
      doc.text(dateStr, pageWidth / 2, titleY + 16, { align: 'center' });

      // Scenario info
      doc.setFontSize(12);
      const scenarioText = (scenarioParams && (scenarioParams.ebitdaDrop || scenarioParams.rateHike))
        ? `Scenario: Custom Stress Test - ${scenarioParams.ebitdaDrop ?? 0}% EBITDA Drop, ${scenarioParams.rateHike ?? 0} bps Interest Rate Increase`
        : 'Scenario: Baseline (0% stress)';
      doc.setTextColor(150, 150, 150);
      doc.text(scenarioText, pageWidth / 2, titleY + 26, { align: 'center' });

      // Teal horizontal bar bottom
      doc.setFillColor(32, 201, 151);
      doc.rect(0, pageHeight - 60, pageWidth, 20, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text(title, pageWidth / 2, pageHeight - 46, { align: 'center' });

      // Footer page number
      doc.setFontSize(10);
      doc.setTextColor(108, 117, 125);
      doc.text(`Page 1 of 999`, pageWidth - margin + 5, pageHeight - 10, { align: 'right' });

      // New page: Executive Summary
      doc.addPage();
      const page2 = 2;
      doc.setFontSize(20);
      doc.setTextColor(32, 201, 151);
      doc.text('Executive Summary', margin, 30);
      addHeader(title);

      // KPI boxes
      doc.setFontSize(11);
      const kpiY = 40;
      const boxW = 70;
      const boxH = 35;
      const gap = 10;
      const left = margin;

      const formatCurrency = (v) => {
        if (v >= 1e9) return `€${(v / 1e9).toFixed(1)}B`;
        if (v >= 1e6) return `€${(v / 1e6).toFixed(1)}M`;
        return `€${v.toFixed(1)}`;
      };

      const totalValue = portfolioData.totalPortfolioValue || 0;
      const avgRisk = portfolioData.avgRiskScore || 0;
      const compliance = portfolioData.complianceRate || 0;
      const loansAtRisk = portfolioData.atRiskLoans || 0;

      const boxes = [
        { title: 'Total Portfolio Value', value: formatCurrency(totalValue), subtitle: `From ${portfolioData.loans.length} loans` },
        { title: 'Average Risk Score', value: `${avgRisk}/100`, subtitle: 'Portfolio-wide metric' },
        { title: 'Compliance Rate', value: `${compliance}%`, subtitle: 'Loans fully compliant' },
        { title: 'Loans at Risk', value: `${loansAtRisk}`, subtitle: 'Require monitoring' }
      ];

      boxes.forEach((b, idx) => {
        const x = left + (idx % 2) * (boxW + gap);
        const y = kpiY + Math.floor(idx / 2) * (boxH + gap);
        doc.setDrawColor(32, 201, 151);
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(x, y, boxW, boxH, 3, 3, 'FD');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.text(b.title, x + 3, y + 8);
        doc.setFontSize(16);
        doc.text(b.value, x + 3, y + 20);
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.text(b.subtitle, x + 3, y + 28);
      });

      // Bullet points (key findings)
      const bullets = [
        `Key Finding 1: Portfolio average risk is ${avgRisk}/100.`,
        `Key Finding 2: Compliance rate is ${compliance}%.`,
        `Key Finding 3: ${portfolioData.breachedLoans || 0} breached loans detected.`,
        `Recommended Action 1: Prioritise remediation for top risk loans.`,
        `Recommended Action 2: Engage with borrowers in watchlist.`
      ];

      let bx = margin;
      let by = kpiY + 80;
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      bullets.forEach((t) => {
        const lines = doc.splitTextToSize(`• ${t}`, pageWidth - margin * 2);
        doc.text(lines, bx, by);
        by += lines.length * 6;
      });

      // Portfolio overview table start on next page(s)
      doc.addPage();
      doc.setFontSize(16);
      doc.setTextColor(32, 201, 151);
      doc.text('Portfolio Overview', margin, 24);
      addHeader(title);
      doc.setFontSize(10);

      // Table header
      const headers = ['Company', 'Sector', 'Exposure (€M)', 'Risk Score', 'Status', 'Days to Breach'];
      let startY = 32;
      const colWidths = [60, 30, 25, 20, 25, 25];
      let x = margin;
      headers.forEach((h, idx) => {
        doc.setFillColor(32, 201, 151);
        doc.setTextColor(255, 255, 255);
        doc.rect(x, startY - 6, colWidths[idx], 8, 'F');
        doc.text(h, x + 2, startY);
        x += colWidths[idx];
      });

      // Table rows: iterate loans sorted by risk desc with dynamic row heights
      const sorted = (portfolioData.loans || []).slice().sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0));
      let rowY = startY + 6;
      const pageBottom = 280;
      const tableWidth = colWidths.reduce((s, v) => s + v, 0);

      const renderHeader = () => {
        x = margin;
        headers.forEach((h, idx) => {
          doc.setFillColor(32, 201, 151);
          doc.setTextColor(255, 255, 255);
          doc.rect(x, rowY - 6, colWidths[idx], 8, 'F');
          const headerText = doc.splitTextToSize(h, colWidths[idx] - 4);
          doc.text(headerText, x + 2, rowY);
          x += colWidths[idx];
        });
        rowY += 8;
      };

      renderHeader();

      for (let i = 0; i < sorted.length; i++) {
        const r = sorted[i];
        const companyLines = doc.splitTextToSize(String(r.companyName || ''), colWidths[0] - 4);
        const sectorLines = doc.splitTextToSize(String(r.sector || ''), colWidths[1] - 4);
        const linesCount = Math.max(companyLines.length, sectorLines.length, 1);
        const cellHeight = linesCount * 5 + 6;

        if (rowY + cellHeight > pageBottom) {
          doc.addPage();
          rowY = 28;
          addHeader(title);
          renderHeader();
        }

        const bg = r.status === 'breached' || r.status === 'default' ? [255, 230, 230] : (r.status === 'at_risk' ? [255, 245, 230] : [240, 255, 245]);
        doc.setFillColor(bg[0], bg[1], bg[2]);
        doc.rect(margin, rowY - 4, tableWidth, cellHeight - 2, 'F');

        // cells
        let cellX = margin + 1;
        doc.setTextColor(20, 20, 20);
        doc.text(companyLines, cellX, rowY);
        cellX += colWidths[0];
        doc.text(sectorLines, cellX, rowY);
        cellX += colWidths[1];
        doc.text(`${(r.loanAmount || 0).toFixed(1)}`, cellX, rowY);
        cellX += colWidths[2];
        doc.text(String(r.riskScore || 0), cellX, rowY);
        cellX += colWidths[3];
        doc.text(String(r.status || ''), cellX, rowY);
        cellX += colWidths[4];
        doc.text(`${Math.round(r.daysToBreach || 0)}d`, cellX, rowY);

        rowY += cellHeight + 4;
      }

      // Finalize and return blob
      const pdfBlob = doc.output('blob');
      return pdfBlob;
    } catch (e) {
      logger.error('PDF generation failed', e);
      throw e;
    }
  };

  return { getPortfolioData, calculateReportMetrics, generatePDF, generateReportPDF };
}

// Render a simple HTML preview for modal display
export const renderReportHtml = (reportType, portfolioData, metrics, scenarioParams = {}, images = {}) => {
  const title = (() => {
    switch (reportType) {
      case 'compliance': return 'Covenant Compliance Report';
      case 'analytics': return 'Portfolio Analytics Report';
      case 'risk': return 'Risk Assessment Report';
      case 'stress': return 'Stress Test Results Report';
      case 'environmental': return 'Environmental Impact Report';
      case 'executive': return 'Executive Summary Report';
      default: return `${reportType} Report`;
    }
  })();

  const kpis = {
    totalPortfolioValue: portfolioData.totalPortfolioValue || 0,
    avgRiskScore: portfolioData.avgRiskScore || 0,
    complianceRate: portfolioData.complianceRate || 0,
    breachedLoans: portfolioData.breachedLoans || 0
  };

  const rows = (portfolioData.loans || []).slice(0, 10).map(l => `
    <tr>
      <td>${(l.companyName || l.company || 'N/A')}</td>
      <td>${(l.sector || 'N/A')}</td>
      <td style="text-align:right">€${(l.loanAmount||0).toFixed(1)}</td>
      <td style="text-align:right">${(l.riskScore||0)}</td>
      <td>${(l.status||'')}</td>
    </tr>`).join('');

  const imagesHtml = Object.keys(images).length ? `
    <div class="images-grid">${Object.keys(images).map(k => `<div class="img-card"><h4>${k}</h4><img src="${images[k]}"/></div>`).join('')}</div>` : '';

  // Improved printable HTML for higher-fidelity canvas capture / printing
  return `
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <style>
        @page { size: A4; margin: 12mm; }
        body { font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color: #222; margin:0; padding:0; }
        .pdf-page { width:210mm; box-sizing: border-box; padding: 12mm; background: #fff; color: #222; }
        .report-title { color: #0fb57a; font-size: 24px; margin: 0 0 8px 0; }
        .meta { color: #6c757d; font-size: 12px; margin-bottom: 12px; }
        .kpis { display:flex; gap:12px; flex-wrap:wrap; margin-bottom:12px }
        .kpi { background:#f7faf7; border-left:4px solid #20c997; padding:10px; border-radius:6px; min-width:140px }
        .kpi .label { font-size:12px; color:#6c757d }
        .kpi .value { font-size:18px; font-weight:700 }
        table { width:100%; border-collapse:collapse; font-size:12px; margin-top:8px }
        th,td { padding:8px 6px; border:1px solid #e6e9ea; text-align:left }
        th { background:#20c997; color:#fff; font-weight:600 }
        .images-grid { display:flex; gap:12px; flex-wrap:wrap; margin-top:12px }
        .img-card { flex:1 1 45%; }
        .img-card img { width:100%; border:1px solid #e5e7eb; border-radius:6px }
        .section { margin-top:14px }
        .muted { color:#6c757d; font-size:13px }
        /* Ensure page breaks for long sections when printing */
        .page-break { page-break-after: always; }
      </style>
    </head>
    <body>
      <div class="pdf-page">
        <h1 class="report-title">${title}</h1>
        <div class="meta">Generated: ${new Date().toLocaleString()}</div>
        <div class="kpis">
          <div class="kpi"><div class="label">Total Portfolio Value</div><div class="value">€${(kpis.totalPortfolioValue||0).toFixed(1)}</div></div>
          <div class="kpi"><div class="label">Average Risk Score</div><div class="value">${kpis.avgRiskScore}/100</div></div>
          <div class="kpi"><div class="label">Compliance Rate</div><div class="value">${kpis.complianceRate}%</div></div>
        </div>
        <div class="section">
          <h3 style="margin:0 0 6px 0">Top 10 Loans (sample)</h3>
          <table>
            <thead><tr><th>Company</th><th>Sector</th><th style="text-align:right">Exposure</th><th style="text-align:right">Risk</th><th>Status</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        ${imagesHtml}
      </div>
    </body>
    </html>`;
};

// New: detailed pdfMake-based generator for Stress report (falls back if pdfMake not available)
export const generateDetailedReportPDF = async (extracted, portfolioData = {}, scenarioParams = {}) => {
  try {
    // dynamic import so runtime only requires pdfmake if available
    // Use @vite-ignore so Vite doesn't try to pre-resolve this optional dependency at dev/build time
    const pdfMake = await import(/* @vite-ignore */ 'pdfmake/build/pdfmake');
    const vfsFonts = await import(/* @vite-ignore */ 'pdfmake/build/vfs_fonts');
    if (vfsFonts && vfsFonts.pdfMake && vfsFonts.pdfMake.vfs) pdfMake.vfs = vfsFonts.pdfMake.vfs;

    const pageSize = 'A4';

    const kpis = [
      { label: 'Total Portfolio Value', value: `€${(portfolioData.totalPortfolioValue||0).toLocaleString()}` },
      { label: 'Average Risk Score', value: `${portfolioData.avgRiskScore || 0}/100` },
      { label: 'Compliance Rate', value: `${portfolioData.complianceRate ?? 0}%` }
    ];

    const sectorTableBody = [
      [{ text: 'Sector', style: 'tableHeader' }, { text: 'Impact %', style: 'tableHeader' }, { text: 'Exposure', style: 'tableHeader' }]
    ];
    (extracted.sectorImpact || []).slice(0, 50).forEach(s => sectorTableBody.push([s.sector || '-', `${Math.round((s.impactPct||0)*100)}%`, `€${Math.round(s.exposure||0)}`]));

    const impactedLoansBody = [
      [{ text: 'Company', style: 'tableHeader' }, { text: 'Stressed Risk', style: 'tableHeader' }, { text: 'Covenant', style: 'tableHeader' }, { text: 'Exposure', style: 'tableHeader' }]
    ];
    (extracted.impactedLoans || []).slice(0, 200).forEach(l => impactedLoansBody.push([l.company || '-', l.stressedRisk || l.stressedStatus || '-', l.covenantAffected || '-', `€${Math.round(l.loanAmount||0)}`]));

    const docDefinition = {
      pageSize,
      pageMargins: [36, 60, 36, 60],
      header: (currentPage, pageCount) => ({
        margin: [36, 20, 36, 0],
        columns: [
          { text: 'Stress Test Results Report', style: 'headerTitle' },
          { text: `Page ${currentPage} / ${pageCount}`, alignment: 'right', style: 'headerMeta' }
        ]
      }),
      footer: (currentPage, pageCount) => ({ text: `Generated: ${new Date().toLocaleString()} — Page ${currentPage} of ${pageCount}`, alignment: 'center', margin: [0, 6, 0, 0], style: 'footer' }),
      content: [
        { text: 'Executive Summary', style: 'sectionTitle' },
        { text: extracted.findingSummary || 'This stress scenario summary highlights the most significant impacts and recommended actions.', margin: [0, 0, 0, 8] },
        { columns: kpis.map(k => ({ width: '*', stack: [{ text: k.label, style: 'kpiLabel' }, { text: k.value, style: 'kpiValue' }] })) , columnGap: 12 },

        { text: 'Scenario Parameters', style: 'subTitle' },
        { ul: [ `EBITDA drop: ${scenarioParams.ebitdaDrop ?? 0}%`, `Rate increase: ${scenarioParams.rateHike ?? 0} bps` ], margin: [0,0,0,8] },

        { text: 'Sector Impacts', style: 'sectionTitle' },
        { table: { headerRows: 1, widths: ['*', 80, 100], body: sectorTableBody }, layout: 'lightHorizontalLines', margin: [0,0,0,8] },

        { text: 'Top Impacted Loans (sample)', style: 'sectionTitle' },
        { table: { headerRows: 1, widths: ['*', 80, 120, 80], body: impactedLoansBody }, layout: 'lightHorizontalLines', margin: [0,0,0,8] },

        { text: 'Findings & Recommendations', style: 'sectionTitle' },
        { ol: (extracted.recommendations && extracted.recommendations.length) ? extracted.recommendations.slice(0,20) : [ 'Prioritise discussions with top impacted borrowers to restructure covenants.', 'Increase monitoring cadence and add watchlists for affected sectors.', 'Consider targeted provisioning for highest exposure counterparties.' ], margin: [0,0,0,8] }
      ],
      styles: {
        headerTitle: { fontSize: 12, bold: true, color: '#20c997' },
        headerMeta: { fontSize: 9, color: '#6b7280' },
        footer: { fontSize: 9, color: '#6b7280' },
        sectionTitle: { fontSize: 14, bold: true, color: '#20c997', margin: [0,8,0,6] },
        subTitle: { fontSize: 11, bold: true, color: '#374151' },
        kpiLabel: { fontSize: 9, color: '#6b7280' },
        kpiValue: { fontSize: 12, bold: true },
        tableHeader: { bold: true, fontSize: 10, color: 'white', fillColor: '#20c997' }
      },
      defaultStyle: { fontSize: 10 }
    };

    return await new Promise((resolve, reject) => {
      try {
        const pdfObj = pdfMake.createPdf(docDefinition);
        pdfObj.getBlob((blob) => resolve(blob));
      } catch (e) { reject(e); }
    });
  } catch (err) {
    // pdfMake not available or error — bubble up so caller can fallback
    throw err;
  }
};

// High-level report generator that uses specialized extractors to build unique PDFs
export const generateReportPDF = async (reportType, portfolioData = {}, scenarioParams = {}) => {
  // Use specialized extractor
  try {
    let extracted = {};
    switch (reportType) {
      case 'compliance': extracted = extractors.extractCovenantComplianceData(portfolioData); break;
      case 'analytics': extracted = extractors.extractPortfolioAnalyticsData(portfolioData); break;
      case 'risk': extracted = extractors.extractRiskAssessmentData(portfolioData); break;
      case 'stress': extracted = extractors.extractStressTestData(portfolioData, scenarioParams); break;
      case 'environmental': extracted = extractors.extractEnvironmentalData(portfolioData); break;
      case 'executive': extracted = extractors.extractExecutiveData(portfolioData); break;
      default: extracted = { note: 'No extractor found, using raw portfolio' };
    }

    // For 'stress' report prefer using pdfMake for richer layout if available
    if (reportType === 'stress') {
      try {
        const detailedBlob = await generateDetailedReportPDF(extracted, portfolioData, scenarioParams);
        return detailedBlob;
      } catch (e) {
        // pdfMake not available or failed — fall back to jsPDF below
        logger.warn('pdfMake detailed generator failed, falling back to jsPDF generator', e);
      }
    }

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = 210;
    const margin = 20;

    // Helper to add a consistent header and a lightweight footer placeholder
    const addHeader = (pageTitle) => {
      try {
        doc.setFontSize(10);
        doc.setTextColor(80);
        doc.text(pageTitle, margin, 12);
        doc.setDrawColor(220);
        doc.setLineWidth(0.4);
        doc.line(margin, 16, pageWidth - margin, 16);
      } catch (e) {
        // header best-effort
      }
    };

    // Cover
    doc.setFontSize(30);
    doc.setTextColor(32, 201, 151);
    const title = (reportType === 'compliance' && 'Covenant Compliance Report')
      || (reportType === 'analytics' && 'Portfolio Analytics Report')
      || (reportType === 'risk' && 'Risk Assessment Report')
      || (reportType === 'stress' && 'Stress Test Results Report')
      || (reportType === 'environmental' && 'Environmental Impact Report')
      || (reportType === 'executive' && 'Executive Summary Report')
      || `${reportType} Report`;
    doc.text(title, pageWidth / 2, 80, { align: 'center' });
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Generated: ${format(new Date(), 'dd LLL yyyy')}`, pageWidth / 2, 92, { align: 'center' });
    if (scenarioParams && (scenarioParams.ebitdaDrop || scenarioParams.rateHike)) {
      doc.text(`Scenario: ${scenarioParams.ebitdaDrop ?? 0}% EBITDA Drop, ${scenarioParams.rateHike ?? 0} bps rate hike`, pageWidth / 2, 100, { align: 'center' });
    }

    // Executive summary / page 2
    doc.addPage();
    doc.setFontSize(18);
    doc.setTextColor(32, 201, 151);
    doc.text('Executive Summary', margin, 30);
    doc.setFontSize(11);
    doc.setTextColor(50);

    // Compose summary per report
    const writeLine = (y, text) => { doc.text(text, margin, y); };
    let y = 44;
    if (reportType === 'compliance') {
      writeLine(y, `Compliance Rate: ${extracted.complianceRate ?? portfolioData.complianceRate ?? 0}%`); y += 8;
      writeLine(y, `Breached Loans Count: ${extracted.breachedLoans.length}`); y += 8;
      writeLine(y, `At-Risk Loans Count: ${extracted.atRiskLoans.length}`); y += 8;
      const avgDays = extracted.atRiskLoans.length ? Math.round(extracted.atRiskLoans.reduce((s, l) => s + (l.daysToBreach || 0), 0) / extracted.atRiskLoans.length) : 0;
      writeLine(y, `Average Days to Breach (at-risk): ${avgDays}`); y += 8;
      writeLine(y, `Key Finding: ${extracted.breachedLoans.length} loans are in breach status requiring immediate legal action`); y += 8;
      writeLine(y, `Recommended Action: Initiate covenant waiver negotiations for ${extracted.breachedLoans.length} loans`); y += 12;
    } else if (reportType === 'analytics') {
      const totalValue = portfolioData.totalPortfolioValue || 0;
      writeLine(y, `Total Portfolio Value: €${(totalValue).toLocaleString()}`); y += 8;
      writeLine(y, `Avg Risk Score: ${portfolioData.avgRiskScore || 0}/100`); y += 8;
      const sectors = extracted.sectorPerformance || [];
      const best = sectors.slice().sort((a,b)=>a.avgRisk-b.avgRisk)[0];
      const worst = sectors.slice().sort((a,b)=>b.avgRisk-a.avgRisk)[0];
      writeLine(y, `Best Performing Sector: ${best ? best.sector : 'N/A'} (avg risk ${best ? best.avgRisk : 'N/A'})`); y += 8;
      writeLine(y, `Worst Performing Sector: ${worst ? worst.sector : 'N/A'} (avg risk ${worst ? worst.avgRisk : 'N/A'})`); y += 8;
    } else if (reportType === 'risk') {
      const dist = extracted.riskDistribution || {};
      const counts = { safe: (dist.safe||[]).length, critical: (dist.critical||[]).length };
      writeLine(y, `Safe (0-20%): ${counts.safe} loans`); y += 8;
      writeLine(y, `Critical (80-100%): ${counts.critical} loans`); y += 8;
      writeLine(y, `Highest Risk Loan: ${extracted.topRiskyLoans && extracted.topRiskyLoans[0] ? extracted.topRiskyLoans[0].company : 'N/A'}`); y += 8;
    } else if (reportType === 'stress') {
      const b = extracted.baseline || {};
      const s = extracted.stressed || {};
      // Compact KPI-style summary lines for stress scenario
      writeLine(y, `Baseline — Breached: ${b.breached || 0} | At-Risk: ${b.atRisk || 0} | Compliance: ${b.complianceRate ?? '-'}% | Avg Risk: ${b.avgRisk ?? '-'}`); y += 8;
      writeLine(y, `Stressed — Breached: ${s.breached || 0} | At-Risk: ${s.atRisk || 0} | Compliance: ${s.complianceRate ?? '-'}% | Avg Risk: ${s.avgRisk ?? '-'}`); y += 9;
      // Top sector impacts
      const sectors = extracted.sectorImpact || [];
      writeLine(y, `Top impacted sectors: ${sectors.slice(0,3).map(sx => `${sx.sector} (${Math.round((sx.impactPct||0)*100)}%)`).join(' • ') || 'N/A'}`); y += 8;
      writeLine(y, `Summary: ${(extracted.findingSummary) ? extracted.findingSummary : 'Stress scenario increases breach likelihood across concentrated sectors; see detailed analysis.'}`); y += 8;
    } else if (reportType === 'environmental') {
      const e = extracted.esgScores || {};
      writeLine(y, `Portfolio Green Score: ${Math.round(((extracted.greenLoanData && extracted.greenLoanData.value) || 0) / Math.max(1, portfolioData.totalPortfolioValue || 1) * 100)}%`); y += 8;
      writeLine(y, `Environmental: ${e.environmental} | Social: ${e.social} | Governance: ${e.governance}`); y += 8;
      writeLine(y, `Annual CO2 Reduction: ${extracted.climateMetrics ? extracted.climateMetrics.co2Reduction : 'N/A'} metric tons`); y += 8;
    } else if (reportType === 'executive') {
      const k = extracted.keyMetrics || {};
      writeLine(y, `Total Portfolio: €${(k.totalValue || 0).toLocaleString()} | ${k.loanCount} loans`); y += 8;
      writeLine(y, `Compliance Rate: ${k.complianceRate}% | At-Risk Loans: ${portfolioData.atRiskLoans || 0}`); y += 8;
      writeLine(y, `Green Loans: ${k.greenPct}% (${(portfolioData.greenLoanValue || 0) ? '€' + (portfolioData.greenLoanValue || 0) : '€0'})`); y += 8;
    }

    // Add detailed section(s)
    doc.addPage();
    doc.setFontSize(16);
    doc.setTextColor(32, 201, 151);
    doc.text('Detailed Analysis', margin, 30);
    addHeader(title);
    doc.setFontSize(11);
    let dy = 40;

    if (reportType === 'compliance') {
      // Section A: Breached Covs
      doc.setFontSize(13); doc.text('SECTION A: BREACHED COVENANTS', margin, dy); dy += 8; doc.setFontSize(10);
      extracted.breachedLoans.slice(0, 20).forEach((l) => {
        doc.setTextColor(180, 20, 20);
        doc.text(`${l.company}`, margin, dy); dy += 6;
        doc.setTextColor(20);
        const cov = (l.covenants && l.covenants[0]) || { type: 'Unknown', threshold: '-', current: '-' };
        doc.text(`Covenant: ${cov.type} | Threshold: ${cov.threshold || '-'} | Current: ${cov.current || '-'} | Days in Breach: ${l.daysInBreach || 0}`, margin + 6, dy); dy += 6;
        doc.text(`Recommended Legal Action: ${'Initiate covenant waiver discussion'}`, margin + 6, dy); dy += 8;
        if (dy > 260) { doc.addPage(); dy = 30; }
      });
      // Section B: At-risk
      doc.addPage(); dy = 36; doc.setFontSize(13); doc.setTextColor(255, 140, 20); doc.text('SECTION B: AT-RISK LOANS', margin, 30); doc.setFontSize(10);
      extracted.atRiskLoans.slice(0, 40).forEach(l => {
        doc.setTextColor(0);
        doc.text(`${l.company} — Days to breach: ${l.daysToBreach || 'N/A'} — Trajectory: declining at approx ${Math.round(((l.trendPct || 0))) || 0}%/month`, margin, dy); dy += 6;
        if (dy > 260) { doc.addPage(); dy = 30; }
      });
      // Section C: Compliance Summary Table (simple)
      doc.addPage(); doc.setFontSize(13); doc.setTextColor(32,201,151); doc.text('SECTION C: COMPLIANCE SUMMARY TABLE', margin, 30); doc.setFontSize(9);
      let ry = 40; extracted.atRiskLoans.concat(extracted.breachedLoans).slice(0, 80).forEach((l) => {
        doc.text(`${l.company} | ${l.covenants && l.covenants[0] ? l.covenants[0].type : '-'} | ${l.covenants && l.covenants[0] ? (l.covenants[0].threshold || '-') : '-'} | ${l.covenants && l.covenants[0] ? (l.covenants[0].current || '-') : '-'} | ${l.daysToBreach || '-'} | ${l.status || 'N/A'}`, margin, ry); ry += 5; if (ry > 270) { doc.addPage(); ry = 30; }
      });
    }

    // For other report types, provide concise detailed lists to satisfy structure
    if (reportType === 'analytics') {
      const sectors = extracted.sectorPerformance || [];
      let ay = 40;
      sectors.slice(0, 20).forEach(s => { doc.text(`${s.sector} | Loans: ${s.totalLoans} | Exposure: €${Math.round(s.exposure)} | AvgRisk: ${s.avgRisk}% | Compliant: ${s.compliant}`, margin, ay); ay += 6; if (ay > 260) { doc.addPage(); ay = 30; } });
    }

    if (reportType === 'risk') {
      let ry = 40; extracted.topRiskyLoans.forEach(r => { doc.text(`${r.rank}. ${r.company} | Risk: ${r.riskScore} | Primary: ${r.primaryRisk}`, margin, ry); ry += 6; if (ry > 260) { doc.addPage(); ry = 30; } });
    }

    if (reportType === 'stress') {
      // KPI boxes for quick glance
      const boxW = 80; const boxH = 18;
      try {
        doc.setFillColor(245, 250, 245);
        doc.setDrawColor(200);
        doc.rect(margin, 36, boxW, boxH, 'F');
        doc.setFontSize(10); doc.setTextColor(30);
        doc.text(`Baseline Breached: ${ (extracted.baseline && extracted.baseline.breached) || 0}`, margin + 4, 36 + 6);
        doc.text(`At-Risk: ${ (extracted.baseline && extracted.baseline.atRisk) || 0}`, margin + 4, 36 + 12);

        doc.rect(margin + boxW + 8, 36, boxW, boxH, 'F');
        doc.text(`Stressed Breached: ${ (extracted.stressed && extracted.stressed.breached) || 0}`, margin + boxW + 12, 36 + 6);
        doc.text(`At-Risk: ${ (extracted.stressed && extracted.stressed.atRisk) || 0}`, margin + boxW + 12, 36 + 12);
      } catch (e) {
        // best-effort
      }

      // Sector impact list
      let sy = 36 + boxH + 8;
      doc.setFontSize(12); doc.setTextColor(32,201,151); doc.text('Sector Impacts (top 6)', margin, sy); sy += 8; doc.setFontSize(10); doc.setTextColor(40);
      (extracted.sectorImpact || []).slice(0, 20).forEach((s) => {
        doc.text(`${s.sector} — Impact: ${Math.round((s.impactPct||0)*100)}% | Exposure: €${Math.round(s.exposure||0)}`, margin, sy);
        sy += 6; if (sy > 260) { doc.addPage(); sy = 30; }
      });

      // Impacted loans table (sample)
      if ((extracted.impactedLoans || []).length) {
        if (sy > 220) { doc.addPage(); sy = 36; }
        doc.setFontSize(12); doc.setTextColor(32,201,151); doc.text('Top impacted loans (sample)', margin, sy); sy += 8; doc.setFontSize(9); doc.setTextColor(30);
        extracted.impactedLoans.slice(0, 80).forEach(l => {
          doc.text(`${l.company} | Stressed Risk: ${l.stressedRisk || l.stressedStatus || '-'} | Covenant Affected: ${l.covenantAffected || '-' } | Exposure: €${Math.round(l.loanAmount||0)}`, margin, sy);
          sy += 5; if (sy > 260) { doc.addPage(); sy = 30; }
        });
      }

      // Findings & Recommendations
      if (sy > 220) { doc.addPage(); sy = 36; }
      doc.setFontSize(12); doc.setTextColor(32,201,151); doc.text('Findings & Recommendations', margin, sy); sy += 8; doc.setFontSize(10); doc.setTextColor(40);
      const recs = extracted.recommendations || [
        'Prioritise discussions with the top 10 impacted borrowers to restructure covenants.',
        'Increase monitoring cadence for affected sectors and set watchlists.',
        'Consider targeted provisioning for highest exposure counterparties.'
      ];
      recs.slice(0,10).forEach((r, idx) => { doc.text(`• ${r}`, margin + 4, sy); sy += 6; if (sy > 260) { doc.addPage(); sy = 30; } });
    }

    if (reportType === 'environmental') {
      doc.text('ESG Scorecard:', margin, 40); doc.text(`Environmental: ${extracted.esgScores.environmental} | Social: ${extracted.esgScores.social} | Governance: ${extracted.esgScores.governance}`, margin, 48);
      let gy = 58; (extracted.sdgAlignment || []).forEach(s => { doc.text(`SDG ${s.sdg}: supporting ~${s.loans} loans`, margin, gy); gy += 6; if (gy > 260) { doc.addPage(); gy = 30; } });
    }

    if (reportType === 'executive') {
      doc.text('Top Risks & Opportunities:', margin, 40);
      let ey = 48;
      (extracted.criticalRisks || []).forEach((r, idx) => { doc.text(`R${idx+1}: ${r.company} | Risk Score: ${r.riskScore}`, margin, ey); ey += 6; if (ey > 260) { doc.addPage(); ey = 30; } });
      (extracted.opportunities || []).forEach((o, idx) => { doc.text(`O${idx+1}: ${o.company} | Est. Benefit: €${o.benefitEst}`, margin, ey); ey += 6; if (ey > 260) { doc.addPage(); ey = 30; } });
    }

    // Add page footers (page x of y)
    try {
      const pageCount = doc.internal && doc.internal.getNumberOfPages ? doc.internal.getNumberOfPages() : 1;
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        const footerText = `Page ${p} of ${pageCount}`;
        doc.text(footerText, pageWidth - margin, 287, { align: 'right' });
      }
    } catch (e) {
      logger.warn('Could not add page footers', e);
    }

    const pdfBlob = doc.output('blob');
    return pdfBlob;
  } catch (e) {
    logger.error('generateReportPDF failed', e);
    throw e;
  }
};

// Default exports for non-hook usage (useful in utilities)
export const getPortfolioData = (portfolioState) => {
  if (portfolioState) return portfolioState;
  return makeMockPortfolio();
};

export default {
  useReportService
};
