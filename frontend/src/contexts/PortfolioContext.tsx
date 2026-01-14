import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { updateStoreLoansFromExternal, updateStoreStressParamsFromExternal, updateStoreScenarioSummaryFromExternal, useGreenGaugeStore } from '@/store/useGreenGaugeStore';
// Single source of truth for loan dataset used across the app
import loansData from '@/data/loansData';
import { generateMockLoans } from '@/data/generatedMockLoans';
import { GreenLoan } from '@/types/greenLoan';

// Types
export type CovenantType = 'LLCR' | 'DSCR' | 'Interest Coverage' | 'Leverage Ratio' | 'Current Ratio';
export type Sector = 'Agriculture' | 'Renewable Energy' | 'Water' | 'Construction' | 'Transportation' | 'Technology';

export interface Covenant {
  type: CovenantType;
  current: number;
  threshold: number;
  variance: number; // percent
}

export interface ESG {
  score: number;
  target: number;
  coReduced: number;
  energyGenerated: number;
}

export type Loan = GreenLoan;

export interface StressTestResult {
  breachedCount: number;
  atRiskCount: number;
  safeCount: number;
  exposureAtRisk: number;
}

export interface SimulationState {
  isSimulating: boolean;
  scenario: 'baseline' | 'stressed';
  ebitdaDrop: number; // 0-100
  interestRateHike: number; // 0-500 bps
  stressedResults: StressTestResult | null;
  appliedAt: Date | null;
}

export interface PortfolioState {
  loans: Loan[];
  baselineLoans: Loan[] | null;
  totalValue: number;
  riskScore: number;
  breachedCount: number;
  atRiskCount: number;
  safeCount: number;
  simulation: SimulationState;
  lastUpdated: Date | null;
}

interface PortfolioActions {
  setLoans: (loans: Loan[]) => void;
  runSimulation: (ebitdaDrop: number, interestRateHike: number) => void;
  resetSimulation: () => void;
  calculateRiskMetrics: () => void;
  updateSummaryDisplay: () => void;
  getState: () => PortfolioState;
  // New requested actions
  updateSimulatorParameters: (ebitdaDrop: number, interestRateHike: number) => void;
  loadLoans: (count: number, replace?: boolean) => void;
  appendLoans: (count: number) => void;
  applyStressScenario: (type: 'baseline'|'rate'|'ebitda'|'esg'|'combined') => void;
  resetToBaseline: () => void;
}

const defaultSimulation: SimulationState = {
  isSimulating: false,
  scenario: 'baseline',
  ebitdaDrop: 0,
  interestRateHike: 0,
  stressedResults: null,
  appliedAt: null,
};

const defaultState: PortfolioState = {
  loans: [],
  totalValue: 0,
  riskScore: 0,
  breachedCount: 0,
  atRiskCount: 0,
  safeCount: 0,
  simulation: defaultSimulation,
  lastUpdated: null,
};

export const PortfolioContext = createContext<PortfolioState & PortfolioActions & { ready: boolean } | undefined>(undefined);

export const PortfolioProvider: React.FC<{ children: React.ReactNode; initialLoans?: Loan[] }> = ({ children, initialLoans = [] }) => {
  const [loans, setLoansInternal] = useState<Loan[]>(initialLoans);
  const [baselineLoans, setBaselineLoans] = useState<Loan[] | null>(initialLoans.length ? initialLoans : null);
  const [simulation, setSimulation] = useState<SimulationState>(defaultSimulation);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const recalcTotals = (currentLoans: Loan[]) => {
    // Support both loanAmount and amount fields, and riskScore as number or object
    const totalValue = currentLoans.reduce((s, l) => s + ((l as any).loanAmount ?? (l as any).amount ?? 0), 0);
    const riskScore = currentLoans.length
      ? Math.round(currentLoans.reduce((s, l) => {
          const rs = typeof (l as any).riskScore === 'number' ? (l as any).riskScore : ((l as any).riskScore?.overall ?? 0);
          return s + rs;
        }, 0) / currentLoans.length)
      : 0;
    const breachedCount = currentLoans.filter(l => (l as any).status === 'breached' || (l as any).status === 'default').length;
    const atRiskCount = currentLoans.filter(l => (l as any).status === 'watchlist' || (l as any).status === 'warning' || (l as any).status === 'at_risk').length;
    const safeCount = currentLoans.filter(l => (l as any).status === 'active' || (l as any).status === 'compliant').length;
    return { totalValue, riskScore, breachedCount, atRiskCount, safeCount };
  };

  const [totals, setTotals] = useState(() => recalcTotals(initialLoans));

  useEffect(() => {
    setTotals(recalcTotals(loans));
  }, [loans]);

  // Persist loans and scenario to localStorage so state survives reloads
  useEffect(() => {
    try {
      const payload = {
        loans,
        totals,
        lastUpdated: lastUpdated ? lastUpdated.toISOString() : null,
        simulation
      };
      localStorage.setItem('greengauge.state', JSON.stringify(payload));
    } catch (e) {
      // ignore storage errors (e.g., private mode)
    }
  }, [loans, totals, lastUpdated, simulation]);

  // If no initial loans were provided, seed the context from the legacy store's mock loans (fast path)
  useEffect(() => {
    if ((!initialLoans || initialLoans.length === 0) && loans.length === 0) {
      try {
        const storeLoans = (useGreenGaugeStore as any).getState().loans as Loan[] | undefined;
        if (storeLoans && storeLoans.length > 0) {
          setLoansInternal(storeLoans.map(l => ({ ...l })) as Loan[]);
          if (!baselineLoans) setBaselineLoans(storeLoans.map(l => ({ ...l })));
        } else {
          // No legacy data — seed with canonical frontend mock loans for offline/demo mode
          const mocked = loansData as Loan[];
          setLoansInternal(mocked as Loan[]);
          if (!baselineLoans || baselineLoans.length === 0) setBaselineLoans(mocked.map(l => ({ ...l })));
          setLastUpdated(new Date());
        }
      } catch (e) {
        // ignore
      }
    }
  }, []);

  // On mount, attempt to restore saved state from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('greengauge.state');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.loans && Array.isArray(parsed.loans) && parsed.loans.length > 0) {
          setLoansInternal(parsed.loans.map((l: any) => ({ ...l })));
          if (!baselineLoans || baselineLoans.length === 0) setBaselineLoans(parsed.loans.map((l: any) => ({ ...l })));
        }
        if (parsed.simulation) {
          // Restore simulation shape
          setSimulation(prev => ({ ...prev, ...parsed.simulation }));
        }
        if (parsed.lastUpdated) setLastUpdated(new Date(parsed.lastUpdated));
      }
    } catch (e) {
      // ignore parse errors
    }
  }, []);

  // Subscribe to legacy Zustand store changes so UI components that update the
  // legacy store (e.g. FileUpload -> addLoan) are reflected here in PortfolioContext.
  useEffect(() => {
    try {
      // subscribe to only the loans slice
      const unsubscribe = (useGreenGaugeStore as any).subscribe((state: any) => state.loans, (storeLoans: Loan[]) => {
        if (Array.isArray(storeLoans) && storeLoans.length >= 0) {
          // Mirror changes into this context's loans state
          setLoansInternal(storeLoans.map(l => ({ ...l })) as Loan[]);
          // If baseline not set, initialize it
          if (!baselineLoans || baselineLoans.length === 0) {
            setBaselineLoans(storeLoans.map(l => ({ ...l })));
          }
          setLastUpdated(new Date());
        }
      });

      return () => {
        try { unsubscribe(); } catch (e) { /* ignore */ }
      };
    } catch (e) {
      // ignore if subscription fails (older store API)
    }
  }, [baselineLoans]);

  // Mirror PortfolioContext loans/state into the legacy Zustand store for compatibility
  useEffect(() => {
    try {
      updateStoreLoansFromExternal(loans as any);
    } catch (e) {
      // ignore
    }
  }, [loans]);

  // Actions
  const setLoans = (newLoans: Loan[]) => {
    // ensure no nulls
    const sanitized = newLoans.map(l => ({ ...l })) as Loan[];
    setLoansInternal(sanitized);
    // if baseline not set, store the provided dataset as baseline
    if (!baselineLoans || baselineLoans.length === 0) {
      setBaselineLoans(sanitized.map(l => ({ ...l })));
    }
    setLastUpdated(new Date());
    // Mirror into legacy store for compatibility
    try { updateStoreLoansFromExternal(sanitized as any); } catch (e) {}
  };

  // New convenience action: load a fresh set of loans (replace by default)
  const loadLoans = (count: number, replace = true) => {
    try {
      const generated = generateMockLoans(count);
      if (replace) {
        setBaselineLoans(generated.map(l => ({ ...l })));
        setLoansInternal(generated.map(l => ({ ...l })));
      } else {
        setLoansInternal(prev => [...prev, ...generated.map(l => ({ ...l }))]);
      }
      setLastUpdated(new Date());
    } catch (e) {
      // fallback: if generator unavailable, try to slice existing data
      if (replace) {
        const fallback = (loansData as any).slice(0, count) as Loan[];
        setBaselineLoans(fallback.map(l => ({ ...l })));
        setLoansInternal(fallback.map(l => ({ ...l })));
      } else {
        const fallback = (loansData as any).slice(0, count) as Loan[];
        setLoansInternal(prev => [...prev, ...fallback.map(l => ({ ...l }))]);
      }
    }
    // Recalculate metrics and persist
    calculateRiskMetrics();
    resetSimulation();
  };

  const appendLoans = (count: number) => loadLoans(count, false);

  const updateSimulatorParameters = (ebitdaDrop: number, interestRateHike: number) => {
    // clamp inputs
    const e = Math.max(0, Math.min(100, ebitdaDrop ?? 0));
    const r = Math.max(0, Math.min(500, interestRateHike ?? 0));
    runSimulation(e, r);
  };

  const applyStressScenario = (type: 'baseline'|'rate'|'ebitda'|'esg'|'combined') => {
    switch (type) {
      case 'baseline':
        runSimulation(0, 0);
        break;
      case 'rate':
        // +2% == 200 bps
        runSimulation(0, 200);
        break;
      case 'ebitda':
        runSimulation(10, 0);
        break;
      case 'esg':
        // ESG miss - degrade covenant-related risk modestly
        runSimulation(5, 50);
        break;
      case 'combined':
        runSimulation(15, 250);
        break;
      default:
        runSimulation(0, 0);
    }
  };

  const resetToBaseline = () => {
    if (baselineLoans && baselineLoans.length > 0) {
      setLoansInternal(baselineLoans.map(l => ({ ...l })));
    } else {
      // regenerate 150 baseline
      try {
        const gen = generateMockLoans(150);
        setBaselineLoans(gen.map(l => ({ ...l })));
        setLoansInternal(gen.map(l => ({ ...l })));
      } catch (e) {
        // fallback to existing loansData
        const fallback = (loansData as any).slice(0, 150) as Loan[];
        setBaselineLoans(fallback.map(l => ({ ...l })));
        setLoansInternal(fallback.map(l => ({ ...l })));
      }
    }
    resetSimulation();
    calculateRiskMetrics();
  };

  const setScenario = (scenario: { ebitdaDrop?: number; interestRateHike?: number } | null) => {
    if (!scenario) {
      resetSimulation();
      try { localStorage.removeItem('greengauge.state'); } catch (e) {}
      return;
    }
    // Apply the scenario by running the simulation which will update simulation/stressed results
    runSimulation(scenario.ebitdaDrop ?? 0, scenario.interestRateHike ?? 0);
    try {
      const s = { ebitdaDrop: scenario.ebitdaDrop ?? 0, interestRateHike: scenario.interestRateHike ?? 0, appliedAt: new Date().toISOString() };
      localStorage.setItem('greengauge.scenario', JSON.stringify(s));
    } catch (e) {}
  };

  const calculateRiskMetrics = () => {
    const { breachedCount, atRiskCount, safeCount } = recalcTotals(loans);
    setTotals(prev => ({ ...prev, breachedCount, atRiskCount, safeCount }));
    setLastUpdated(new Date());
  };

  const updateSummaryDisplay = () => {
    setLastUpdated(new Date());
  };

  const runSimulation = (ebitdaDrop: number, interestRateHike: number) => {
    setSimulation(prev => ({ ...prev, isSimulating: true }));

    // Deterministic-ish transform based on inputs (works with GreenLoan shape)
    const applyStressToLoan = (loan: Loan): Loan => {
      const base = (loan as any).riskScore?.overall ?? 20;
      const adj = Math.min(100, Math.max(0, base + ebitdaDrop * 0.8 + (interestRateHike / 10) * 0.5));
      let status: any = (loan as any).status;
      if (adj >= 80) status = 'default';
      else if (adj >= 30) status = 'watchlist';
      else status = 'active';

      const daysToBreachBaseline = status === 'default' ? 0 : (status === 'watchlist' ? Math.floor(10 + (adj % 80)) : null);
      const prevRisk = (loan as any).riskScore || { overall: base, covenantComponent: base * 0.6, impactComponent: base * 0.4, level: 'medium', trend: 'stable' };
      const newOverall = Math.round(Math.min(100, Math.max(0, (prevRisk.overall * 0.6) + (adj * 0.4))));
      const newRisk = { ...prevRisk, overall: newOverall, level: newOverall >= 75 ? 'high' : newOverall >= 50 ? 'medium' : 'low' };

      const updated: any = {
        ...loan,
        status,
        daysToBreachBaseline,
        breachProbability: Math.round(adj),
        riskScore: newRisk
      };
      return updated as Loan;
    };

    // Compute stressed results without mutating baseline loans
    const stressedLoans = loans.map(applyStressToLoan);

    const breachedCount = stressedLoans.filter((l: any) => (l as any).status === 'default' || (l as any).status === 'breached').length;
    const atRiskCount = stressedLoans.filter((l: any) => (l as any).status === 'watchlist' || (l as any).status === 'warning' || (l as any).status === 'at_risk').length;
    const safeCount = stressedLoans.filter((l: any) => (l as any).status === 'active' || (l as any).status === 'compliant').length;
    const exposureAtRisk = stressedLoans.filter((l: any) => (l as any).status !== 'active').reduce((s: number, l: any) => s + ((l.loanAmount as number) || (l.amount as number) || 0), 0);

    // Store stressedResults and keep baseline loans untouched
    setSimulation({
      isSimulating: false,
      scenario: 'stressed',
      ebitdaDrop,
      interestRateHike,
      stressedResults: { breachedCount, atRiskCount, safeCount, exposureAtRisk },
      appliedAt: new Date()
    });

    // Do NOT overwrite baseline loans or totals — keep Summary showing baseline
    // Push only params to legacy store (so UI controls stay in sync)
    try { updateStoreStressParamsFromExternal(ebitdaDrop, interestRateHike); } catch (e) {}

    // Also update legacy store scenario summary so other parts of the UI read scenario counts
    try { updateStoreScenarioSummaryFromExternal({ totalLoans: stressedLoans.length, loans_breached: breachedCount, loans_at_risk: atRiskCount, loans_safe: safeCount }); } catch (e) {}

    setLastUpdated(new Date());
  };

  const resetSimulation = () => {
    setSimulation(defaultSimulation);
    // Do not touch baseline loans (they were never overwritten)
    calculateRiskMetrics();
    setLastUpdated(new Date());
  };

  const getState = (): PortfolioState => ({
    loans,
    baselineLoans,
    totalValue: totals.totalValue,
    riskScore: totals.riskScore,
    breachedCount: totals.breachedCount,
    atRiskCount: totals.atRiskCount,
    safeCount: totals.safeCount,
    simulation,
    lastUpdated
  });

  const value = useMemo(() => ({
    ...getState(),
    setLoans,
    setScenario,
    runSimulation,
    resetSimulation,
    calculateRiskMetrics,
    updateSummaryDisplay,
    // new actions
    updateSimulatorParameters,
    loadLoans,
    appendLoans,
    applyStressScenario,
    resetToBaseline,
    getState,
    ready: true
  }), [loans, totals, simulation, lastUpdated]);

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
};

export const usePortfolio = () => {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error('usePortfolio must be used within PortfolioProvider');
  return ctx;
};
