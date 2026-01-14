import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import jsPDF from 'jspdf';
import * as extractors from '../greengauge/src/services/reportDataExtractors.js';

const outDir = path.join(process.cwd(), 'scripts', 'output', 'pdfs');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Create a mock portfolio similar to generator
const makeMockPortfolio = () => {
  const loans = Array.from({ length: 120 }).map((_, i) => ({
    id: `L-${i+1}`,
    companyName: `Company ${i+1}`,
    sector: ['Energy', 'Agriculture', 'Transport', 'Construction', 'Technology'][i % 5],
    loanAmount: +(Math.random() * 200).toFixed(1),
    riskScore: Math.round(Math.random() * 100),
    status: Math.random() > 0.85 ? 'breached' : (Math.random() > 0.7 ? 'at_risk' : 'compliant'),
    daysToBreach: Math.floor(Math.random() * 120),
    esg: { environmental: Math.round(Math.random() * 100), social: Math.round(Math.random() * 100), governance: Math.round(Math.random() * 100) },
    covenants: [{ type: i % 2 === 0 ? 'DSCR' : 'Debt-to-EBITDA', threshold: i % 2 === 0 ? 1.5 : 3.0, current: (Math.random() * 2 + 0.5).toFixed(2) }]
  }));
  const totalPortfolioValue = loans.reduce((s, l) => s + (l.loanAmount || 0), 0);
  const avgRiskScore = Math.round(loans.reduce((s, l) => s + (l.riskScore || 0), 0) / loans.length);
  const complianceRate = Math.round((loans.filter(l => l.status === 'compliant').length / loans.length) * 1000) / 10;
  return { loans, totalPortfolioValue, avgRiskScore, complianceRate, breachedLoans: loans.filter(l => l.status === 'breached').length, atRiskLoans: loans.filter(l => l.status === 'at_risk').length, safeLoans: loans.filter(l => l.status === 'compliant').length };
};

(async function run() {
  try {
    const portfolio = makeMockPortfolio();
    const types = ['compliance','analytics','risk','stress','environmental','executive'];
    for (const t of types) {
      let extracted = {};
      if (t === 'compliance') extracted = extractors.extractCovenantComplianceData(portfolio);
      if (t === 'analytics') extracted = extractors.extractPortfolioAnalyticsData(portfolio);
      if (t === 'risk') extracted = extractors.extractRiskAssessmentData(portfolio);
      if (t === 'stress') extracted = extractors.extractStressTestData(portfolio, { ebitdaDrop: 20, rateHike: 200 });
      if (t === 'environmental') extracted = extractors.extractEnvironmentalData(portfolio);
      if (t === 'executive') extracted = extractors.extractExecutiveData(portfolio);

      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      doc.setFontSize(22);
      doc.text(`${t.charAt(0).toUpperCase() + t.slice(1)} Report`, 20, 30);
      doc.setFontSize(11);
      const json = JSON.stringify(extracted, null, 2);
      // write JSON in chunks to avoid single long text call
      const lines = json.split('\n');
      let y = 40;
      const lineHeight = 5;
      for (let i = 0; i < lines.length; i++) {
        if (y > 280) { doc.addPage(); y = 20; }
        const chunk = lines[i].slice(0, 120); // truncate long lines
        doc.text(chunk, 20, y);
        y += lineHeight;
      }

      const arrayBuf = doc.output('arraybuffer');
      const buf = Buffer.from(arrayBuf);
      const outFile = path.join(outDir, `${t}.pdf`);
      fs.writeFileSync(outFile, buf);
      console.log(`Written ${outFile} (${buf.length} bytes)`);
    }
    console.log('PDF generation complete');
  } catch (e) {
    console.error('PDF generation failed', e);
    process.exit(1);
  }
})();
