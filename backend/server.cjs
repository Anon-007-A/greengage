const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// Simple deterministic RNG (mulberry32)
function mulberry32(a) {
  return function() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateLoans(count = 150, seed = 52781437) {
  const rng = mulberry32(seed);
  const companies = ['AgriNova','SolarGrid','AquaWorks','BuildCorp','TransMove','TechSolve'];
  const covenants = ['DSCR','LLCR','Interest Coverage','Leverage Ratio','Current Ratio'];
  const sectors = ['Agriculture','Renewable Energy','Water','Construction','Transportation'];

  // Status buckets mandated
  const statuses = [];
  for (let i = 0; i < 70; i++) statuses.push('active');
  for (let i = 0; i < 50; i++) statuses.push('watchlist');
  for (let i = 0; i < 30; i++) statuses.push('breached');
  // shuffle
  for (let i = statuses.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = statuses[i]; statuses[i] = statuses[j]; statuses[j] = tmp;
  }

  const loans = [];
  for (let i = 0; i < count; i++) {
    const id = `loan-${String(i+1).padStart(4,'0')}`;
    const company = companies[Math.floor(rng() * companies.length)];
    const name = `${company} ${i+1}`;
    const sector = sectors[Math.floor(rng() * sectors.length)];
    const covenantType = covenants[Math.floor(rng() * covenants.length)];
    const amount = Math.round((5 + rng() * (150 - 5)) * 100) / 100;
    const thresholdBase = { 'DSCR':1.25,'LLCR':1.1,'Interest Coverage':2.0,'Leverage Ratio':3.0,'Current Ratio':1.0 }[covenantType];
    const variance = Math.round((rng() * (50 + 30) - 30) * 100) / 100;
    const threshold = Math.round((thresholdBase + (rng() - 0.5) * thresholdBase * 0.3) * 100) / 100;
    const current = Math.round((threshold * (1 + variance/100)) * 100) / 100;
    const status = statuses[i % statuses.length];
    let riskScore = 10 + Math.floor(rng() * 31);
    if (status === 'watchlist') riskScore = 41 + Math.floor(rng() * 30);
    if (status === 'breached') riskScore = 71 + Math.floor(rng() * 30);
    let daysToBreach = null;
    if (status === 'breached') daysToBreach = 0;
    else if (status === 'watchlist') daysToBreach = Math.floor(10 + rng() * 80);
    let breachProbability = 0;
    if (status === 'active') breachProbability = Math.round(rng() * 20);
    else if (status === 'watchlist') breachProbability = 30 + Math.round(rng() * 40);
    else breachProbability = 80 + Math.round(rng() * 20);

    loans.push({
      id,
      name,
      company,
      sector,
      amount,
      covenant: { type: covenantType, current, threshold },
      status,
      riskScore,
      daysToBreach,
      breachProbability
    });
  }
  return loans;
}

// Attempt to load backend/data/loans.json if exists
const dataPath = path.resolve(__dirname, 'data', 'loans.json');
let cachedLoans = null;
if (fs.existsSync(dataPath)) {
  try {
    const raw = fs.readFileSync(dataPath, 'utf8');
    const parsed = JSON.parse(raw);
    cachedLoans = parsed;
    console.log('Loaded loans from', dataPath);
  } catch (e) {
    console.warn('Failed to load loans.json, will generate on the fly');
  }
}

// If no persisted loans exist, generate deterministic loans and persist them
if (!cachedLoans) {
  try {
    const loans = generateLoans(150, 52781437);
    cachedLoans = { loans, total: loans.length };
    try {
      fs.mkdirSync(path.dirname(dataPath), { recursive: true });
      fs.writeFileSync(dataPath, JSON.stringify(cachedLoans, null, 2), 'utf8');
      console.log('Persisted generated loans to', dataPath);
    } catch (writeErr) {
      console.warn('Could not persist generated loans to disk:', writeErr.message || writeErr);
    }
  } catch (genErr) {
    console.error('Failed to generate deterministic loans:', genErr.message || genErr);
  }
}

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.get('/api/loans', (req, res) => {
  const loans = cachedLoans?.loans || generateLoans(150, 52781437);
  res.json({ loans, total: loans.length });
});

app.post('/api/stress-test', (req, res) => {
  const { ebitdaDrop = 0, interestRateHike = 0 } = req.body || {};
  if (typeof ebitdaDrop !== 'number' || ebitdaDrop < 0 || ebitdaDrop > 100) {
    return res.status(400).json({ error: 'Invalid EBITDA drop' });
  }
  const loans = cachedLoans?.loans || generateLoans(150, 52781437);
  const breached = loans.filter(l => {
    const stressedValue = l.covenant.current * (1 - ebitdaDrop/100);
    return stressedValue < l.covenant.threshold;
  }).length;
  const atRisk = loans.filter(l => {
    const stressedValue = l.covenant.current * (1 - ebitdaDrop/100);
    return stressedValue >= l.covenant.threshold && ((stressedValue - l.covenant.threshold) / l.covenant.threshold) < 0.2;
  }).length;
  res.json({ breached, atRisk, safe: loans.length - breached - atRisk, scenario: `${ebitdaDrop}% EBITDA drop, ${interestRateHike} bps rate hike` });
});

const port = process.env.PORT || 8000;
app.listen(port, () => console.log(`Backend quick server running on http://localhost:${port}`));
