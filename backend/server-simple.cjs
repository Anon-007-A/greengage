const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

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

  const statuses = [];
  for (let i = 0; i < 70; i++) statuses.push('active');
  for (let i = 0; i < 50; i++) statuses.push('watchlist');
  for (let i = 0; i < 30; i++) statuses.push('breached');
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

const dataPath = path.resolve(__dirname, 'data', 'loans.json');
let cachedLoans = null;
if (fs.existsSync(dataPath)) {
  try {
    const raw = fs.readFileSync(dataPath, 'utf8');
    cachedLoans = JSON.parse(raw);
    console.log('Loaded loans from', dataPath);
  } catch (e) {
    console.warn('Failed to load loans.json, generating on the fly');
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

function sendJson(res, obj, status=200) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
    res.end();
    return;
  }

  if (parsed.pathname === '/api/health' && req.method === 'GET') {
    sendJson(res, { ok: true });
    return;
  }

  if (parsed.pathname === '/api/loans' && req.method === 'GET') {
    const loans = cachedLoans?.loans || generateLoans(150, 52781437);
    sendJson(res, { loans, total: loans.length });
    return;
  }

  if (parsed.pathname === '/api/stress-test' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      let data = {};
      try { data = JSON.parse(body || '{}'); } catch (e) { return sendJson(res, { error: 'invalid json' }, 400); }
      const { ebitdaDrop = 0, interestRateHike = 0 } = data;
      if (typeof ebitdaDrop !== 'number' || ebitdaDrop < 0 || ebitdaDrop > 100) {
        return sendJson(res, { error: 'Invalid EBITDA drop' }, 400);
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
      sendJson(res, { breached, atRisk, safe: loans.length - breached - atRisk, scenario: `${ebitdaDrop}% EBITDA drop, ${interestRateHike} bps rate hike` });
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

const port = process.env.PORT || 8000;
server.listen(port, () => console.log(`Simple backend running on http://localhost:${port}`));
