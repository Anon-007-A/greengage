import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Import extractors and helper from the greengauge frontend
import {
  extractCovenantComplianceData,
  extractPortfolioAnalyticsData,
  extractRiskAssessmentData,
  extractStressTestData,
  extractEnvironmentalData,
  extractExecutiveData
} from '../greengauge/src/services/reportDataExtractors.js';

const outDir = path.join(process.cwd(), 'scripts', 'output');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

(async function run() {
  try {
    // Build a simple mock portfolio similar to the frontend fallback
    const portfolio = {
      loans: Array.from({ length: 120 }).map((_, i) => ({
        id: `L-${i+1}`,
        companyName: `Company ${i+1}`,
        sector: ['Energy', 'Agriculture', 'Transport', 'Construction', 'Technology'][i % 5],
        loanAmount: +(Math.random() * 200).toFixed(1),
        riskScore: Math.round(Math.random() * 100),
        status: Math.random() > 0.85 ? 'breached' : (Math.random() > 0.7 ? 'at_risk' : 'compliant'),
        daysToBreach: Math.floor(Math.random() * 120),
        esg: { environmental: Math.round(Math.random() * 100), social: Math.round(Math.random() * 100), governance: Math.round(Math.random() * 100) },
        covenants: [{ type: i % 2 === 0 ? 'DSCR' : 'Debt-to-EBITDA', threshold: i % 2 === 0 ? 1.5 : 3.0, current: (Math.random() * 2 + 0.5).toFixed(2) }]
      })),
      totalPortfolioValue: 0,
      avgRiskScore: 0,
      complianceRate: 0
    };
    portfolio.totalPortfolioValue = portfolio.loans.reduce((s, l) => s + (l.loanAmount || 0), 0);
    portfolio.avgRiskScore = Math.round(portfolio.loans.reduce((s, l) => s + (l.riskScore || 0), 0) / portfolio.loans.length);
    portfolio.complianceRate = Math.round((portfolio.loans.filter(l => l.status === 'compliant').length / portfolio.loans.length) * 1000) / 10;


    const cov = extractCovenantComplianceData(portfolio);
    fs.writeFileSync(path.join(outDir, 'covenantCompliance.json'), JSON.stringify(cov, null, 2));

    const analytics = extractPortfolioAnalyticsData(portfolio);
    fs.writeFileSync(path.join(outDir, 'portfolioAnalytics.json'), JSON.stringify(analytics, null, 2));

    const risk = extractRiskAssessmentData(portfolio);
    fs.writeFileSync(path.join(outDir, 'riskAssessment.json'), JSON.stringify(risk, null, 2));

    const stress = extractStressTestData(portfolio, { ebitdaDrop: 20, rateHike: 200 });
    fs.writeFileSync(path.join(outDir, 'stressTest.json'), JSON.stringify(stress, null, 2));

    const env = extractEnvironmentalData(portfolio);
    fs.writeFileSync(path.join(outDir, 'environmental.json'), JSON.stringify(env, null, 2));

    const exec = extractExecutiveData(portfolio);
    fs.writeFileSync(path.join(outDir, 'executive.json'), JSON.stringify(exec, null, 2));

    console.log('Sample extractor outputs written to scripts/output');
  } catch (err) {
    console.error('Failed to generate samples', err);
    process.exit(1);
  }
})();
