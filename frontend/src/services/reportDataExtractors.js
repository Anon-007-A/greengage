// reportDataExtractors.js
// Provides specialized data extraction functions for each report type

export function extractCovenantComplianceData(portfolioData = {}) {
  const loans = (portfolioData.loans || []).map(l => ({
    id: l.id,
    company: l.companyName,
    sector: l.sector,
    loanAmount: l.loanAmount,
    riskScore: l.riskScore,
    status: l.status,
    daysToBreach: l.daysToBreach || null,
    covenants: l.covenants || l.covenantDetails || []
  }));

  const breachedLoans = loans.filter(l => /breach|default/i.test(String(l.status)));
  const atRiskLoans = loans.filter(l => /risk|watch|at_risk|warning/i.test(String(l.status)) && !/breach|default/i.test(String(l.status)));

  const complianceRate = portfolioData.complianceRate ?? (loans.length ? Math.round((loans.filter(l => /active|compliant/i.test(String(l.status))).length / loans.length) * 1000) / 10 : 0);

  const recommendedActions = breachedLoans.map(l => ({ company: l.company, action: 'Initiate covenant waiver discussion', contact: (l.contact || null), timelineDays: 14 }));

  return { breachedLoans, atRiskLoans, complianceRate, recommendedActions };
}

export function extractPortfolioAnalyticsData(portfolioData = {}) {
  const loans = portfolioData.loans || [];
  const sectors = {};
  loans.forEach(l => {
    const s = l.sector || 'Unknown';
    sectors[s] = sectors[s] || { sector: s, totalLoans: 0, exposure: 0, avgRisk: 0, compliant: 0, atRisk: 0, breached: 0 };
    sectors[s].totalLoans += 1;
    sectors[s].exposure += (l.loanAmount || 0);
    sectors[s].avgRisk += (l.riskScore || 0);
    if (/breach|default/i.test(String(l.status))) sectors[s].breached += 1;
    else if (/risk|watch|at_risk/i.test(String(l.status))) sectors[s].atRisk += 1;
    else sectors[s].compliant += 1;
  });
  Object.values(sectors).forEach(s => { s.avgRisk = Math.round(s.avgRisk / Math.max(1, s.totalLoans)); });

  const monthlyTrends = portfolioData.historical || [];

  // Covenant type performance
  const covenantTypes = {};
  loans.forEach(l => {
    const types = (l.covenants || []).map(c => c.type).filter(Boolean);
    if (types.length === 0) types.push(l.covenantType || 'Other');
    types.forEach(t => { covenantTypes[t] = (covenantTypes[t] || 0) + 1; });
  });

  const covenantTypePerformance = Object.keys(covenantTypes).map(k => ({ type: k, count: covenantTypes[k] }));

  const portfolioComposition = {
    byRiskBucket: (portfolioData.riskDistribution || []),
    byStatus: { compliant: portfolioData.safeLoans || 0, atRisk: portfolioData.atRiskLoans || 0, breached: portfolioData.breachedLoans || 0 },
    bySector: Object.values(sectors).sort((a, b) => b.exposure - a.exposure)
  };

  return { sectorPerformance: Object.values(sectors), monthlyTrends, covenantTypePerformance, portfolioComposition };
}

export function extractRiskAssessmentData(portfolioData = {}) {
  const loans = portfolioData.loans || [];
  const buckets = { safe: [], lowMedium: [], mediumHigh: [], high: [], critical: [] };
  loans.forEach(l => {
    const r = l.riskScore || 0;
    if (r <= 20) buckets.safe.push(l);
    else if (r <= 40) buckets.lowMedium.push(l);
    else if (r <= 60) buckets.mediumHigh.push(l);
    else if (r <= 80) buckets.high.push(l);
    else buckets.critical.push(l);
  });

  const topRisky = loans.slice().sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0)).slice(0, 15).map((l, i) => ({ rank: i + 1, company: l.companyName, riskScore: l.riskScore, primaryRisk: (l.primaryRisk || (l.covenants && l.covenants[0] && l.covenants[0].type) || 'Unknown') }));

  const vulnerabilityBySector = (portfolioData.sectorPerformance || []).map(s => ({ sector: s.sector, vulnerability: s.avgRisk > 60 ? 'High' : (s.avgRisk > 40 ? 'Medium' : 'Low'), count: s.count }));

  const riskFactors = [
    { name: 'Interest Rate Sensitivity', affectedLoans: loans.filter(l => l.interestSensitive).map(x => x.companyName), mitigation: 'Interest rate swaps or covenant amendments' },
    { name: 'EBITDA Decline', affectedLoans: loans.filter(l => l.ebitdaDecline).map(x => x.companyName), mitigation: 'Operational improvements or covenant relief' },
    { name: 'Leverage Creep', affectedLoans: loans.filter(l => l.leverageCreep).map(x => x.companyName), mitigation: 'Deleveraging plans' }
  ];

  return { riskDistribution: buckets, topRiskyLoans: topRisky, vulnerabilityBySector, riskFactors };
}

export function extractStressTestData(portfolioData = {}, stressParams = {}) {
  const baseline = { breached: portfolioData.breachedLoans || 0, atRisk: portfolioData.atRiskLoans || 0, complianceRate: portfolioData.complianceRate || 0, avgRisk: portfolioData.avgRiskScore || 0 };
  const ebitdaDrop = stressParams.ebitdaDrop || 0;
  const rateHike = stressParams.rateHike || 0;

  const loans = (portfolioData.loans || []).map(l => ({ ...l, stressedRisk: Math.min(100, Math.round((l.riskScore || 0) + (ebitdaDrop * 0.8) + (rateHike / 10) * 0.5)) }));

  const stressed = { breached: loans.filter(l => l.stressedRisk >= 80).length, atRisk: loans.filter(l => l.stressedRisk >= 30 && l.stressedRisk < 80).length, avgRisk: Math.round(loans.reduce((s, l) => s + l.stressedRisk, 0) / Math.max(1, loans.length)) };

  const impactedLoans = loans.sort((a, b) => b.stressedRisk - a.stressedRisk).slice(0, 20).map(l => ({ company: l.companyName, currentStatus: l.status, stressedStatus: l.stressedRisk, covenantAffected: (l.covenants && l.covenants[0] && l.covenants[0].type) || l.covenantType || 'Unknown' }));

  const sectorImpact = {};
  loans.forEach(l => { sectorImpact[l.sector] = sectorImpact[l.sector] || { sector: l.sector, impacted: 0 }; if (l.stressedRisk >= 50) sectorImpact[l.sector].impacted += 1; });

  const recoveryTimeline = [{ day: 30, breached: Math.round(stressed.breached * 0.9) }, { day: 60, breached: Math.round(stressed.breached * 0.6) }, { day: 90, breached: Math.round(stressed.breached * 0.3) }];

  return { baseline, stressed, impactedLoans, sectorImpact: Object.values(sectorImpact), recoveryTimeline, stressParams: { ebitdaDrop, rateHike } };
}

export function extractEnvironmentalData(portfolioData = {}) {
  const esgScores = portfolioData.esgScores || { environmental: 0, social: 0, governance: 0 };
  const loans = portfolioData.loans || [];
  const greenLoans = loans.filter(l => l.isGreen || (l.esg && (l.esg.environmental || 0) > 60));
  const greenLoanData = { count: greenLoans.length, value: greenLoans.reduce((s, l) => s + (l.loanAmount || 0), 0), bySector: {} };
  greenLoans.forEach(l => { greenLoanData.bySector[l.sector] = (greenLoanData.bySector[l.sector] || 0) + 1; });

  const sdgAlignment = [{ sdg: 7, loans: Math.round(greenLoans.length * 0.4) }, { sdg: 12, loans: Math.round(greenLoans.length * 0.25) }, { sdg: 13, loans: Math.round(greenLoans.length * 0.35) }];

  const climateMetrics = { co2Reduction: Math.round(greenLoanData.value * 0.02 * 100) / 100, cleanEnergyMWh: Math.round(greenLoanData.value * 0.05) };

  return { esgScores, greenLoanData, sdgAlignment, climateMetrics };
}

export function extractExecutiveData(portfolioData = {}) {
  const keyMetrics = { totalValue: portfolioData.totalPortfolioValue || 0, loanCount: (portfolioData.loans || []).length, complianceRate: portfolioData.complianceRate || 0, greenPct: Math.round(((portfolioData.greenLoanValue || 0) / Math.max(1, portfolioData.totalPortfolioValue || 1)) * 100) };

  const topRisks = (portfolioData.loans || []).slice().sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0)).slice(0, 3).map(l => ({ company: l.companyName, riskScore: l.riskScore }));
  const opportunities = (portfolioData.loans || []).filter(l => l.esg && l.esg.environmental > 70).slice(0, 3).map(l => ({ company: l.companyName, benefitEst: Math.round((l.loanAmount || 0) * 0.05) }));

  const actionItems = { urgent: [{ action: 'Engage top 5 critical loans', owner: 'Head of Credit', due: '7 days' }], highPriority: [{ action: 'Review sector concentrations', owner: 'Portfolio Manager', due: '30 days' }], mediumPriority: [{ action: 'Publish ESG snapshot', owner: 'Sustainability Lead', due: '90 days' }] };

  const strategicRecommendations = [{ name: 'Enhance monitoring', description: 'Real-time dashboard for high risk loans', investment: 'Medium' }, { name: 'Green growth', description: 'Increase green loan origination', investment: 'High' }];

  return { keyMetrics, criticalRisks: topRisks, opportunities, actionItems, strategicRecommendations };
}

export default {
  extractCovenantComplianceData,
  extractPortfolioAnalyticsData,
  extractRiskAssessmentData,
  extractStressTestData,
  extractEnvironmentalData,
  extractExecutiveData
};
