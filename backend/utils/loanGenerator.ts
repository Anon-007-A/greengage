// Deterministic loan generator
// Usage: run with ts-node or compile to JS. Exports generateRealisticLoans and a seed-populate function.

type CovenantType = 'LLCR' | 'DSCR' | 'Interest Coverage' | 'Leverage Ratio' | 'Current Ratio';
type Sector = 'Agriculture' | 'Renewable Energy' | 'Water' | 'Construction' | 'Transportation';

interface Covenant {
  type: CovenantType;
  current: number;
  threshold: number;
  variance: number;
}

interface ESG {
  score: number;
  target: number;
  coReduced: number;
  energyGenerated: number;
}

export interface Loan {
  id: string;
  name: string;
  company: string;
  sector: Sector;
  amount: number; // €M
  covenant: Covenant;
  esg: ESG;
  status: 'active' | 'watchlist' | 'breached';
  riskScore: number;
  daysToBreachBaseline: number | null;
  breachProbability: number;
}

// Simple seeded RNG (mulberry32)
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateRealisticLoans(count = 150, seed = 52781437): Loan[] {
  const rng = mulberry32(seed);

  const covenantTypes: CovenantType[] = ['DSCR', 'LLCR', 'Interest Coverage', 'Leverage Ratio', 'Current Ratio'];
  const covenantDistribution = [0.30, 0.25, 0.25, 0.10, 0.10];

  const sectors: Sector[] = ['Agriculture', 'Renewable Energy', 'Water', 'Construction', 'Transportation'];
  const sectorDistribution = [0.30, 0.25, 0.20, 0.15, 0.10];

  // Status distribution
  // Default mandate: 70 active, 50 watchlist, 30 breached (total 150).
  // If a different count is requested, scale the buckets proportionally while keeping deterministic behavior.
  const statusBuckets: ('active' | 'watchlist' | 'breached')[] = [];
  const mandate = [70, 50, 30];
  const mandateTotal = mandate.reduce((s, v) => s + v, 0);
  // Scale mandated buckets to requested count
  let allocated = 0;
  const scaled = mandate.map((v, idx) => {
    const val = Math.floor((v / mandateTotal) * count);
    allocated += val;
    return val;
  });
  // Fix remainder by adding to the largest bucket(s)
  let rem = count - allocated;
  let idx = 0;
  while (rem > 0) {
    scaled[idx % scaled.length]++;
    rem--;
    idx++;
  }

  for (let i = 0; i < scaled[0]; i++) statusBuckets.push('active');
  for (let i = 0; i < scaled[1]; i++) statusBuckets.push('watchlist');
  for (let i = 0; i < scaled[2]; i++) statusBuckets.push('breached');

  // Shuffle statusBuckets deterministically
  for (let i = statusBuckets.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = statusBuckets[i];
    statusBuckets[i] = statusBuckets[j];
    statusBuckets[j] = tmp;
  }

  const chooseFromDistribution = (items: any[], dist: number[]) => {
    // Normalize distribution (in case of rounding) and pick deterministically
    const total = dist.reduce((s, v) => s + v, 0) || 1;
    const normalized = dist.map(d => d / total);
    const r = rng();
    let acc = 0;
    for (let i = 0; i < items.length; i++) {
      acc += normalized[i];
      if (r <= acc) return items[i];
    }
    return items[items.length - 1];
  };

  const loans: Loan[] = [];

  for (let i = 0; i < count; i++) {
    const id = `LN-${seed}-${(i + 1).toString().padStart(4, '0')}`;
    const company = `${['AgriNova','SolarGrid','AquaWorks','BuildCorp','TransMove','TechSolve'][Math.floor(rng()*6)]}`;
    const name = `${company} ${(i % 200) + 1}`;

    const sector = chooseFromDistribution(sectors, sectorDistribution) as Sector;
    const covenantType = chooseFromDistribution(covenantTypes, covenantDistribution) as CovenantType;

    // Amount random between 5 and 150 with variance
    const amount = Math.round((5 + rng() * (150 - 5)) * 100) / 100; // 2 decimals

    // Covenant threshold ranges by type (generic)
    const thresholdBase = {
      'DSCR': 1.25,
      'LLCR': 1.1,
      'Interest Coverage': 2.0,
      'Leverage Ratio': 3.0,
      'Current Ratio': 1.0
    }[covenantType];

    const variance = Math.round((rng() * (50 + 30) - 30) * 100) / 100; // -30 to +50
    const threshold = Math.round((thresholdBase + (rng() - 0.5) * thresholdBase * 0.3) * 100) / 100;
    const current = Math.round((threshold * (1 + variance / 100)) * 100) / 100;

    // ESG
    const esgScore = Math.round(rng() * 100);
    const esg: ESG = {
      score: esgScore,
      target: Math.min(100, esgScore + Math.round(rng() * 10)),
      coReduced: Math.round(rng() * 1000 * 100) / 100,
      energyGenerated: Math.round(rng() * 10000 * 100) / 100,
    };

    const status = statusBuckets[i] as 'active' | 'watchlist' | 'breached';

    // riskScore based on status ranges
    let riskScore = 10 + Math.floor(rng() * 31); // default safe 10-40
    if (status === 'watchlist') riskScore = 41 + Math.floor(rng() * 30); // 41-70
    if (status === 'breached') riskScore = 71 + Math.floor(rng() * 30); // 71-100

    // daysToBreachBaseline
    let daysToBreachBaseline: number | null = null;
    if (status === 'breached') daysToBreachBaseline = 0;
    else if (status === 'watchlist') daysToBreachBaseline = Math.floor(10 + rng() * 80); // 10-90

    // breachProbability
    let breachProbability = 0;
    if (status === 'active') breachProbability = Math.round(rng() * 20);
    else if (status === 'watchlist') breachProbability = 30 + Math.round(rng() * 40); // 30-70
    else breachProbability = 80 + Math.round(rng() * 20); // 80-100

    const loan: Loan = {
      id,
      name,
      company,
      sector,
      amount,
      covenant: {
        type: covenantType,
        current,
        threshold,
        variance
      },
      esg,
      status,
      riskScore,
      daysToBreachBaseline,
      breachProbability
    };

    loans.push(loan);
  }

  return loans;
}

// NOTE: Do NOT execute Node-specific code (require/fs) in this module as
// it may be imported by frontend tooling. Use the separate Node-only script
// at `backend/scripts/generateLoans.ts` to write `backend/data/loans.json`.
