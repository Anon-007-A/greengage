import fs from 'fs';
import path from 'path';
import * as extractors from '../greengauge/src/services/reportDataExtractors.js';

const outDir = path.join(process.cwd(), 'scripts', 'output', 'previews');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

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

      const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${t} preview</title>
<style>body{font-family:Inter,Arial,Helvetica,sans-serif;padding:20px;color:#222}h1{color:#0fb57a}pre{background:#f7f7f8;padding:12px;border-radius:6px;overflow:auto;max-height:70vh}</style>
</head>
<body>
<h1>${t.charAt(0).toUpperCase() + t.slice(1)} Report Preview</h1>
<p>Generated: ${new Date().toLocaleString()}</p>
<h2>Extracted data (JSON)</h2>
<pre>${JSON.stringify(extracted, null, 2)}</pre>
</body>
</html>`;

      const outFile = path.join(outDir, `${t}.html`);
      fs.writeFileSync(outFile, html, 'utf8');
      console.log(`Written ${outFile}`);
    }
    console.log('HTML preview generation complete');
  } catch (e) {
    console.error('Preview generation failed', e);
    process.exit(1);
  }
})();
