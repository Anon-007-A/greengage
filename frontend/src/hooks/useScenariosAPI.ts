/**
 * useScenariosAPI Hook
 * Fetches stress test scenario results from the GreenGauge API
 */

import { useState, useEffect } from 'react';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { predictPortfolioBreachTimelines } from '@/utils/breachTimelinePredictor';
import { logger } from '@/lib/logger';
import { getCachedJson } from '@/lib/apiCache';
import { cyrb128 } from '@/lib/seededRng';

export interface ScenarioResult {
  scenarioId: string;
  scenarioName: string;
  description: string;
  assumptions: {
    rateHike?: number;
    interestRateChange?: number;
    ebitdaChange?: number;
    esgMissRisk?: boolean;
  };
  results: {
    affectedLoans: Array<{
      loanId: string;
      companyName: string;
      status: 'compliant' | 'at_risk' | 'breached';
      previousStatus: 'compliant' | 'at_risk' | 'breached';
      impactPercent: number;
      covenantsCrossedCount: number;
    }>;
    breachCount: number;
    atRiskCount: number;
    complianceRate: number;
    portfolioImpactPercent: number;
    estimatedRecoveryPeriod: string;
  };
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

// Module-level cache to avoid repeated health checks and noisy console errors
let __apiAvailable: boolean | null = null;
const checkApiAvailability = async (timeoutMs = 2000) => {
  if (__apiAvailable !== null) return __apiAvailable;
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal });
    clearTimeout(id);
    __apiAvailable = res.ok;
  } catch (e) {
    __apiAvailable = false;
  }
  return __apiAvailable;
};

const SCENARIO_CONFIGS = {
  'baseline': {
    name: 'Baseline',
    description: 'Current portfolio with no stress',
  },
  'rate_plus_2': {
    name: 'Rate +2%',
    description: 'Interest rates increase by 2% YoY',
  },
  'ebitda_minus_10': {
    name: 'EBITDA -10%',
    description: 'Earnings decline by 10% due to recession',
  },
  'esg_miss': {
    name: 'ESG Miss',
    description: 'Critical ESG covenant breaches',
  },
  'combined': {
    name: 'Combined Crisis',
    description: 'Simultaneous rate hike + EBITDA drop + ESG miss',
  },
};

export const useScenarios = () => {
  // Pull loans and simulation from PortfolioContext once at hook top-level
  const { loans, simulation } = (usePortfolio() as any) || { loans: [], simulation: null };
  const [scenarios, setScenarios] = useState<Record<string, ScenarioResult>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchScenarios = async () => {
      try {
        setLoading(true);
        setError(null);

        const scenarioIds = Object.keys(SCENARIO_CONFIGS);
        const results: Record<string, ScenarioResult> = {};

        // Check API once. If unavailable, populate mock scenarios and avoid repeated failed requests.
        const apiUp = await checkApiAvailability();
        if (!apiUp) {
          // Create a stable key for the current portfolio so mock scenarios are deterministic and persisted
          const stableKey = (() => {
            try {
              const minimal = (loans || []).map((L: any) => ({ id: L.loanId || L.id || L._id || '', p: L.principal || L.amount || 0, r: L.interestRate || L.rate || 0 }));
              minimal.sort((a: any, b: any) => (a.id || '').localeCompare(b.id || ''));
              const json = JSON.stringify(minimal);
              const parts = cyrb128(json);
              return parts.join('-');
            } catch (e) {
              return 'default';
            }
          })();

          // Try to reuse persisted deterministic mock scenarios for this portfolio
          const persisted = (() => {
            try { const raw = localStorage.getItem(`gg:mockScenarios:${stableKey}`); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
          })();

          if (persisted) {
            Object.assign(results, persisted);
          } else {
            // Ensure loans are sorted deterministically before prediction
            const sortedLoans = (loans || []).slice().sort((a: any, b: any) => {
              const aid = (a.loanId || a.id || a._id || '').toString();
              const bid = (b.loanId || b.id || b._id || '').toString();
              return aid.localeCompare(bid);
            });

            scenarioIds.forEach(scenarioId => {
              let ebitda = 0; let rate = 0;
              switch (scenarioId) {
                case 'rate_plus_2': rate = 200; break;
                case 'ebitda_minus_10': ebitda = 10; break;
                case 'esg_miss': ebitda = 5; rate = 50; break;
                case 'combined': ebitda = 15; rate = 250; break;
                default: break;
              }

              const timelines = predictPortfolioBreachTimelines(sortedLoans || [], { ebitdaDrop: ebitda, rateHike: rate });
              const breachCount = timelines.filter((t: any) => t.estimatedWeeksToBreachQuarterly <= 0).length;
              const atRiskCount = timelines.filter((t: any) => t.estimatedWeeksToBreachQuarterly > 0 && t.estimatedWeeksToBreachQuarterly <= 12).length;
              const total = Math.max(1, sortedLoans?.length || 1);
              const affectedLoans: ScenarioResult['results']['affectedLoans'] = timelines.slice(0, 50).map((t: any) => ({
                loanId: t.loanId,
                companyName: t.company,
                status: (t.estimatedWeeksToBreachQuarterly <= 0 ? 'breached' : (t.estimatedWeeksToBreachQuarterly <= 12 ? 'at_risk' : 'compliant')) as ScenarioResult['results']['affectedLoans'][number]['status'],
                previousStatus: 'compliant' as ScenarioResult['results']['affectedLoans'][number]['previousStatus'],
                impactPercent: Math.min(100, Math.round((100 - t.cushionPercent) / 2)),
                covenantsCrossedCount: 1,
              }));

              results[scenarioId] = {
                scenarioId,
                scenarioName: SCENARIO_CONFIGS[scenarioId as keyof typeof SCENARIO_CONFIGS]?.name || scenarioId,
                description: SCENARIO_CONFIGS[scenarioId as keyof typeof SCENARIO_CONFIGS]?.description || '',
                assumptions: { ebitdaChange: ebitda, interestRateChange: rate },
                results: {
                  affectedLoans,
                  breachCount,
                  atRiskCount,
                  complianceRate: Math.max(0, 100 - Math.round(((breachCount + atRiskCount) / total) * 100)),
                  portfolioImpactPercent: Math.round(((breachCount + atRiskCount) / total) * 100),
                  estimatedRecoveryPeriod: breachCount > 0 ? `${Math.max(4, Math.round(timelines.reduce((s: number, t: any) => s + t.estimatedWeeksToBreachQuarterly, 0) / Math.max(1, breachCount)))} weeks` : 'N/A',
                },
              };
            });

            try { localStorage.setItem(`gg:mockScenarios:${stableKey}`, JSON.stringify(results)); } catch (e) { /* ignore */ }
          }
        } else {
          // Fetch each scenario in parallel
          // Use cached fetches to avoid repeated network calls within TTL
          const promises = scenarioIds.map(async (scenarioId) => {
            try {
              const data = await getCachedJson(`${API_BASE_URL}/scenarios/${scenarioId}`);
              results[scenarioId] = data;
            } catch (err) {
              logger.warn(`Error fetching scenario ${scenarioId}:`, err?.message || err);
              // Fallback to a simple mock result for this scenario
              results[scenarioId] = {
                scenarioId,
                scenarioName: SCENARIO_CONFIGS[scenarioId as keyof typeof SCENARIO_CONFIGS]?.name || scenarioId,
                description: SCENARIO_CONFIGS[scenarioId as keyof typeof SCENARIO_CONFIGS]?.description || '',
                assumptions: {},
                results: {
                  affectedLoans: [],
                  breachCount: 0,
                  atRiskCount: 0,
                  complianceRate: 100,
                  portfolioImpactPercent: 0,
                  estimatedRecoveryPeriod: 'N/A',
                },
              };
            }
          });

          await Promise.all(promises);
        }
        setScenarios(results);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(message);
        logger.error('Error fetching scenarios:', message);
      } finally {
        setLoading(false);
      }
    };

    fetchScenarios();
  }, [loans]);

  return { scenarios, loading, error };
};

export default useScenarios;
