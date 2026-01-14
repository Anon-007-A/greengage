import { GreenLoan, Notification, PortfolioSummary } from '@/types/greenLoan';
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { createSeededRng } from '@/lib/seededRng';
import { generateRealisticLoans } from '../../../backend/utils/loanGenerator';

type Covenant = any;
type ESG = any;

export interface Loan {
  id: string;
  name: string;
  company: string;
  sector: string;
  amount: number;
  covenant: Covenant;
  esg: ESG;
  status: 'active'|'watchlist'|'breached';
  riskScore: number;
  daysToBreachBaseline: number | null;
  breachProbability: number;
}

interface StressTestResult {
  breached: number;
  atRisk: number;
  safe: number;
  exposureAtRisk: number;
  recalculatedRiskScore: number;
  appliedAt: Date;
  ebitdaDrop: number;
  interestRateHike: number;
}

interface SimulationState {
  isSimulating: boolean;
  scenario: 'baseline' | 'stressed';
  ebitdaDrop: number; // 0-100
  interestRateHike: number; // bps
  stressedResults: StressTestResult | null;
  appliedAt: Date | null;
}

interface PortfolioState {
  loans: Loan[];
  totalValue: number;
  riskScore: number;
  breachedCount: number;
  atRiskCount: number;
  safeCount: number;
  simulation: SimulationState;
  lastUpdated: Date | null;
}

type Action =
  | { type: 'SET_LOANS', payload: Loan[] }
  | { type: 'RUN_SIMULATION', payload: { ebitdaDrop: number; interestRateHike: number } }
  | { type: 'RESET_SIMULATION' }
  | { type: 'CALC_METRICS' };

function normalizeStatus(s: any): 'active' | 'watchlist' | 'breached' {
  if (!s) return 'active';
  const st = String(s).toLowerCase();
  if (st.includes('breach') || st.includes('breached') || st.includes('default')) return 'breached';
  if (st.includes('watch') || st.includes('warning') || st.includes('at risk')) return 'watchlist';
  return 'active';
}

function normalizeLoans(arr: any[]): Loan[] {
  return arr.map(l => ({
    ...l,
    status: normalizeStatus(l.status)
  } as Loan));
}

const initialLoans = normalizeLoans(generateRealisticLoans(150, 52781437));
const initialState: PortfolioState = {
  loans: initialLoans,
  totalValue: initialLoans.reduce((s, l) => s + l.amount, 0),
  riskScore: Math.round(initialLoans.reduce((s,l) => s + l.riskScore, 0) / initialLoans.length),
  breachedCount: initialLoans.filter(l => l.status === 'breached').length,
  atRiskCount: initialLoans.filter(l => l.status === 'watchlist').length,
  safeCount: initialLoans.filter(l => l.status === 'active').length,
  simulation: {
    isSimulating: false,
    scenario: 'baseline',
    ebitdaDrop: 0,
    interestRateHike: 0,
    stressedResults: null,
    appliedAt: null
  },
  lastUpdated: new Date()
};

const PortfolioContext = createContext<{
  state: PortfolioState;
  setLoans: (loans: Loan[]) => void;
  runSimulation: (ebitdaDrop: number, interestRateHike: number) => void;
  resetSimulation: () => void;
  calculateRiskMetrics: () => void;
}>({
  state: initialState,
  setLoans: () => {},
  runSimulation: () => {},
  resetSimulation: () => {},
  calculateRiskMetrics: () => {}
});

function reducer(state: PortfolioState, action: Action): PortfolioState {
  switch (action.type) {
    case 'SET_LOANS': {
      const loans = action.payload;
      return {
        ...state,
        loans,
        totalValue: loans.reduce((s,l) => s + l.amount, 0),
        riskScore: Math.round(loans.reduce((s,l) => s + l.riskScore, 0) / Math.max(1, loans.length)),
        breachedCount: loans.filter(l => l.status === 'breached').length,
        atRiskCount: loans.filter(l => l.status === 'watchlist').length,
        safeCount: loans.filter(l => l.status === 'active').length,
        lastUpdated: new Date()
      };
    }
    case 'CALC_METRICS': {
      const loans = state.loans;
      return {
        ...state,
        totalValue: loans.reduce((s, l) => s + l.amount, 0),
        riskScore: Math.round(loans.reduce((s,l) => s + l.riskScore, 0) / Math.max(1, loans.length)),
        breachedCount: loans.filter(l => l.status === 'breached').length,
        atRiskCount: loans.filter(l => l.status === 'watchlist').length,
        safeCount: loans.filter(l => l.status === 'active').length,
        lastUpdated: new Date()
      };
    }
    case 'RUN_SIMULATION': {
      const { ebitdaDrop, interestRateHike } = action.payload;
      // Deep copy loans and apply stress adjustments deterministically
      const loans = state.loans.map(l => {
        // Adjusted breach probability: base + ebitdaDrop*0.6 + interestRateHike*0.08
        let adjBP = l.breachProbability + Math.round(ebitdaDrop * 0.6) + Math.round(interestRateHike * 0.08);
        if (adjBP > 100) adjBP = 100;
        // ensure TypeScript understands this is the Loan status union
        const newStatus: Loan['status'] = adjBP >= 80 ? 'breached' : adjBP >= 30 ? 'watchlist' : 'active';
        // risk score shifts proportionally
        const newRisk = Math.min(100, Math.max(0, Math.round(l.riskScore + (adjBP - l.breachProbability) * 0.6)));
        return { ...l, breachProbability: adjBP, status: newStatus, riskScore: newRisk } as Loan;
      });

      const breached = loans.filter(l => l.status === 'breached').length;
      const atRisk = loans.filter(l => l.status === 'watchlist').length;
      const safe = loans.filter(l => l.status === 'active').length;
      const exposureAtRisk = loans.filter(l => l.status !== 'active').reduce((s,l) => s + l.amount, 0);
      const recalculatedRiskScore = Math.round(loans.reduce((s,l) => s + l.riskScore, 0) / Math.max(1, loans.length));

      return {
        loans,
        totalValue: loans.reduce((s,l) => s + l.amount, 0),
        riskScore: recalculatedRiskScore,
        breachedCount: breached,
        atRiskCount: atRisk,
        safeCount: safe,
        simulation: {
          isSimulating: true,
          scenario: ebitdaDrop === 0 && interestRateHike === 0 ? 'baseline' : 'stressed',
          ebitdaDrop,
          interestRateHike,
          stressedResults: {
            breached,
            atRisk,
            safe,
            exposureAtRisk,
            recalculatedRiskScore,
            appliedAt: new Date(),
            ebitdaDrop,
            interestRateHike
          },
          appliedAt: new Date()
        },
        lastUpdated: new Date()
      };
    }
    case 'RESET_SIMULATION': {
      // regenerate baseline from initial seed to ensure deterministic baseline
      const baselineLoans = normalizeLoans(generateRealisticLoans(state.loans.length, 52781437));
      return {
        ...state,
        loans: baselineLoans,
        totalValue: baselineLoans.reduce((s,l) => s + l.amount, 0),
        riskScore: Math.round(baselineLoans.reduce((s,l) => s + l.riskScore, 0) / baselineLoans.length),
        breachedCount: baselineLoans.filter(l => l.status === 'breached').length,
        atRiskCount: baselineLoans.filter(l => l.status === 'watchlist').length,
        safeCount: baselineLoans.filter(l => l.status === 'active').length,
        simulation: {
          isSimulating: false,
          scenario: 'baseline',
          ebitdaDrop: 0,
          interestRateHike: 0,
          stressedResults: null,
          appliedAt: null
        },
        lastUpdated: new Date()
      };
    }
    default:
      return state;
  }
}

export const PortfolioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    // ensure metrics are consistent on mount
    dispatch({ type: 'CALC_METRICS' });
  }, []);

  const setLoans = (loans: Loan[]) => dispatch({ type: 'SET_LOANS', payload: loans });
  const runSimulation = (ebitdaDrop: number, interestRateHike: number) => dispatch({ type: 'RUN_SIMULATION', payload: { ebitdaDrop, interestRateHike } });
  const resetSimulation = () => dispatch({ type: 'RESET_SIMULATION' });
  const calculateRiskMetrics = () => dispatch({ type: 'CALC_METRICS' });

  return (
    React.createElement(
      PortfolioContext.Provider,
      { value: { state, setLoans, runSimulation, resetSimulation, calculateRiskMetrics } },
      children
    )
  );
};

export const usePortfolio = () => {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error('usePortfolio must be used within PortfolioProvider');
  return ctx;
};

// deterministic RNG for mock data
const _rng = createSeededRng('GreenGauge123');
function randBetween(min: number, max: number) {
  return Math.floor(_rng() * (max - min + 1)) + min;
}

function pick<T>(arr: T[], i: number) {
  return arr[i % arr.length];
}

const COMPANY_PREFIXES = [
  'SolarGrid',
  'GreenBuild',
  'EcoTransport',
  'CleanWater',
  'WindPower',
  'HydroWorks',
  'AgriNova',
  'ForestHoldings',
  'UrbanRenew',
  'BatteryCo'
];

const SECTORS = [
  'Renewable Energy',
  'Sustainable Construction',
  'Green Transportation',
  'Water Treatment',
  'Agriculture',
  'Forestry',
  'Energy Storage',
  'Waste Management'
];

export function generateMockLoans(count = 150): GreenLoan[] {
  const loans: GreenLoan[] = [];
  for (let i = 1; i <= count; i++) {
    const prefix = pick(COMPANY_PREFIXES, i - 1);
    const companyName = `${prefix} ${i}`;
    const sector = pick(SECTORS, i - 1);
    const loanAmount = randBetween(5_000_000, 150_000_000);
    const statusRoll = randBetween(1, 100);
    let status: 'active' | 'watchlist' | 'default' = 'active';
    if (statusRoll > 85) status = 'default';
    else if (statusRoll > 60) status = 'watchlist';

    const overallRisk = randBetween(10, 90);

    let COVENANT_TYPES = [
      { name: 'Debt-to-EBITDA', unit: 'x', threshold: 4.0 },
      { name: 'DSCR', unit: 'x', threshold: 1.2 },
      { name: 'Interest Coverage Ratio', unit: 'x', threshold: 2.0 },
      { name: 'Leverage Ratio', unit: 'x', threshold: 3.5 },
      { name: 'Current Ratio', unit: '', threshold: 1.0 },
    ];

    let chosen = COVENANT_TYPES[i % COVENANT_TYPES.length];
    const desiredStatus = (overallRisk > 75) ? 'breached' : (overallRisk > 55) ? 'warning' : 'compliant';

    // Set currentValue based on desired status to ensure it actually breaches/warns
    let currentValue: number;
    if (desiredStatus === 'breached') {
      // For breached: set value beyond threshold
      if (chosen.name === 'Current Ratio') {
        currentValue = Number((randBetween(10, Math.floor(chosen.threshold * 90)) / 100).toFixed(2)); // Below threshold
      } else {
        currentValue = Number((randBetween(Math.floor(chosen.threshold * 110), Math.floor(chosen.threshold * 200)) / 100).toFixed(2)); // Above threshold
      }
    } else if (desiredStatus === 'warning') {
      // For warning: set value close to threshold (within 10%)
      if (chosen.name === 'Current Ratio') {
        currentValue = Number((randBetween(Math.floor(chosen.threshold * 95), Math.floor(chosen.threshold * 105)) / 100).toFixed(2));
      } else {
        currentValue = Number((randBetween(Math.floor(chosen.threshold * 95), Math.floor(chosen.threshold * 105)) / 100).toFixed(2));
      }
    } else {
      // For compliant: set value safely away from threshold
      if (chosen.name === 'Current Ratio') {
        currentValue = Number((randBetween(Math.floor(chosen.threshold * 110), Math.floor(chosen.threshold * 200)) / 100).toFixed(2)); // Well above threshold
      } else {
        currentValue = Number((randBetween(Math.floor(chosen.threshold * 10), Math.floor(chosen.threshold * 90)) / 100).toFixed(2)); // Well below threshold
      }
    }

    const covenant = {
      id: `cov-${String(i).padStart(3,'0')}-1`,
      name: chosen.name,
      type: 'financial',
      currentValue,
      threshold: chosen.threshold,
      operator: chosen.name === 'Current Ratio' ? '>' : '<',
      unit: chosen.unit,
      status: desiredStatus,
      cushionPercent: randBetween(-20, 80),
      daysToBreachEstimate: overallRisk > 60 ? randBetween(10,120) : null,
      trend: [randBetween(200,400)/100, randBetween(200,400)/100, randBetween(200,400)/100],
      lastUpdated: '2024-12-20'
    };

    const loan: GreenLoan = {
      id: `loan-${String(i).padStart(3, '0')}`,
      companyName,
      sector,
      loanAmount,
      currency: 'EUR',
      originationDate: '2023-01-01',
      maturityDate: '2030-12-31',
      interestRate: Number((randBetween(200, 500) / 100).toFixed(2)),
      status: status === 'default' ? 'watchlist' : 'active',
      relationshipManager: pick(['Johan Schmidt','Hans Mueller','Sophie Bernard','Erik Johansson','Lena Rossi'], i-1),
      lastReviewDate: '2024-12-20',
      covenants: [ covenant ],
      esgMetrics: [
        {
          id: `esg-${String(i).padStart(3,'0')}-1`,
          name: 'CO2 Emissions Reduced',
          category: 'environmental',
          currentValue: randBetween(1000,50000),
          targetValue: randBetween(50000,100000),
          unit: 'tonnes/year',
          progressPercent: randBetween(10,100),
          verificationStatus: 'verified',
          submissionHistory: [],
          lastUpdated: '2024-12-20'
        }
      ],
      riskScore: {
        overall: overallRisk,
        covenantComponent: randBetween(10,90),
        impactComponent: randBetween(10,90),
        level: overallRisk >= 75 ? 'high' : overallRisk >= 50 ? 'medium' : 'low',
        trend: overallRisk > 60 ? 'deteriorating' : 'stable',
        recommendations: [],
        lastCalculated: '2024-12-20'
      }
    } as unknown as GreenLoan;

    loans.push(loan);
  }
  return loans;
}

export const mockLoans: GreenLoan[] = generateMockLoans(150);

export const mockNotifications: Notification[] = [
  {
    id: 'notif-001',
    type: 'alert',
    title: 'Covenant Breach Detected',
    message: 'A covenant has exceeded threshold in the portfolio',
    loanId: 'loan-003',
    timestamp: '2024-12-22T09:30:00Z',
    read: false
  },
  {
    id: 'notif-002',
    type: 'warning',
    title: 'Approaching Threshold',
    message: 'A covenant cushion below critical threshold detected',
    loanId: 'loan-002',
    timestamp: '2024-12-20T14:15:00Z',
    read: false
  }
];

import { calculatePortfolioSummary as calculatePortfolioSummaryShared } from '@/lib/portfolioSummary';

export const calculatePortfolioSummary = calculatePortfolioSummaryShared;
