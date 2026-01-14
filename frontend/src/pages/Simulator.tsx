import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useStressTest, useExport } from '@/hooks/useApi';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { useGlobalData } from '@/context/GlobalDataContext';
import { usePortfolioStatus } from '@/hooks/usePortfolioStatus';
import { ScenarioImpactPreview } from '@/components/dashboard/ScenarioImpactPreview';
import { BreachTimeline } from '@/components/dashboard/BreachTimelineVisualization';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, TrendingDown, TrendingUp, CheckCircle2, XCircle, Download, Info, ArrowRight, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

interface PresetScenario {
  name: string;
  ebitdaDrop: number;
  rateHike: number;
  key: 'baseline' | 'rate' | 'ebitda' | 'esg' | 'combined';
  color: string;
  icon: typeof TrendingDown;
}

const PRESET_SCENARIOS: PresetScenario[] = [
  { name: 'Mild Downturn', ebitdaDrop: 5, rateHike: 50, key: 'ebitda', color: 'bg-green-100 hover:bg-green-200 border-green-300', icon: TrendingDown },
  { name: 'Rate Shock', ebitdaDrop: 0, rateHike: 200, key: 'rate', color: 'bg-yellow-100 hover:bg-yellow-200 border-yellow-300', icon: TrendingUp },
  { name: 'Recession', ebitdaDrop: 15, rateHike: 150, key: 'combined', color: 'bg-orange-100 hover:bg-orange-200 border-orange-300', icon: AlertTriangle },
];

const Simulator = () => {
  const navigate = useNavigate();
  const { runSimulation, resetSimulation, simulation, applyStressScenario, resetToBaseline } = usePortfolio();
  const { allLoans, breachedLoans: baselineBreached, atRiskLoans: baselineAtRisk } = useGlobalData();
  const [localEbitdaDrop, setLocalEbitdaDrop] = useState(simulation.ebitdaDrop || 0);
  const [localRateHike, setLocalRateHike] = useState(simulation.interestRateHike || 0);
  const { loading, result, error } = useStressTest();
  const { exportStressTest, loading: exportLoading } = useExport();

  // Sync local state with context
  useEffect(() => {
    setLocalEbitdaDrop(simulation.ebitdaDrop || 0);
    setLocalRateHike(simulation.interestRateHike || 0);
  }, [simulation]);

  // Get real-time portfolio status for preview (reads canonical loans and preview params)
  const portfolioStatus = usePortfolioStatus(allLoans as any, localEbitdaDrop, localRateHike);
  const {
    breachedLoanCount,
    atRiskLoanCount,
    totalLoanCount,
    covenantTypesBreached,
    covenantTypesAtRisk
  } = portfolioStatus;

  const handlePresetScenario = (scenario: PresetScenario) => {
    setLocalEbitdaDrop(scenario.ebitdaDrop);
    setLocalRateHike(scenario.rateHike);
    // Use PortfolioContext helper to apply named scenario (keeps logic centralized)
    try {
      applyStressScenario(scenario.key);
    } catch (err) {
      // Fallback to direct run
      runSimulation(scenario.ebitdaDrop, scenario.rateHike);
    }
  };

  const handleReset = () => {
    setLocalEbitdaDrop(0);
    setLocalRateHike(0);
    // Reset simulation state and restore baseline dataset
    try { resetToBaseline(); } catch (e) { resetSimulation(); }
  };

  const handleRunSimulation = async () => {
    // update context immediately so other tabs read stressed results
    try {
      runSimulation(localEbitdaDrop, localRateHike);
    } catch (err) {
      logger.error('Simulation error:', err);
    }
  };

  // Auto-run simulation when sliders change (debounced) so state persists across tabs immediately
  const _debounceRef = useRef<number | null>(null);
  useEffect(() => {
    const simE = simulation.ebitdaDrop || 0;
    const simR = simulation.interestRateHike || 0;
    // If local controls already match the last-run simulation, don't re-run
    if (localEbitdaDrop === simE && localRateHike === simR) return;

    if (_debounceRef.current) {
      clearTimeout(_debounceRef.current);
    }
      _debounceRef.current = window.setTimeout(() => {
      try {
        runSimulation(localEbitdaDrop, localRateHike);
      } catch (err) {
        logger.error('Simulation error (debounced):', err);
      }
      _debounceRef.current = null;
    }, 400);

    return () => {
      if (_debounceRef.current) {
        clearTimeout(_debounceRef.current);
        _debounceRef.current = null;
      }
    };
  }, [localEbitdaDrop, localRateHike, runSimulation, simulation.ebitdaDrop, simulation.interestRateHike]);

  // If backend returns results, you may choose to sync here; for now context runSimulation holds single source of truth

  const handleExport = async () => {
    if (result?.test_id) {
      await exportStressTest(result.test_id, 'excel');
    }
  };


  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Covenant Breach Simulator</h1>
          <p className="text-muted-foreground mt-1">
            Stress test your loan portfolio with customizable scenarios
          </p>
        </div>

        {/* Quick Scenarios */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Scenarios</CardTitle>
            <CardDescription>Select a preset scenario or customize your own</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {PRESET_SCENARIOS.map((scenario) => {
                const Icon = scenario.icon;
                const isActive = localEbitdaDrop === scenario.ebitdaDrop && localRateHike === scenario.rateHike;
                return (
                  <Button
                    key={scenario.name}
                    variant="outline"
                    onClick={() => handlePresetScenario(scenario)}
                    className={cn(
                      'gap-2',
                      isActive && 'ring-2 ring-primary'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {scenario.name}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                onClick={handleReset}
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Simulation Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Stress Test Parameters</CardTitle>
            <CardDescription>
              Configure the stress scenario to simulate covenant breaches
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* EBITDA Drop */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="ebitda-drop">EBITDA Drop</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="ebitda-drop"
                    type="number"
                    min="0"
                    max="100"
                    value={localEbitdaDrop}
                    onChange={(e) => setLocalEbitdaDrop(Number(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
              <Slider
                value={[localEbitdaDrop]}
                onValueChange={([value]) => setLocalEbitdaDrop(value)}
                min={0}
                max={100}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Simulate a {localEbitdaDrop}% reduction in EBITDA
              </p>
            </div>

            {/* Interest Rate Hike */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="rate-hike">Interest Rate Hike</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="rate-hike"
                    type="number"
                    min="0"
                    value={localRateHike}
                    onChange={(e) => setLocalRateHike(Number(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">bps</span>
                </div>
              </div>
              <Slider
                value={[localRateHike]}
                onValueChange={([value]) => setLocalRateHike(value)}
                min={0}
                max={500}
                step={10}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Simulate a {localRateHike} basis point ({localRateHike / 100}%) increase in interest rates
              </p>
            </div>

            <Button
              onClick={handleRunSimulation}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? 'Running Simulation...' : 'Run Stress Test'}
            </Button>
          </CardContent>
        </Card>

        {/* Real-time Scenario Impact Preview */}
        <ScenarioImpactPreview
          loans={allLoans as any}
          ebitdaDropPercent={localEbitdaDrop}
          interestRateHikeBps={localRateHike}
          baselineMetrics={{ breachedCount: baselineBreached, atRiskCount: baselineAtRisk, greenScore: 0 }}
        />

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Simulation Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Results Summary (existing backend results) */}
        {result && result.risk_heatmap && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Simulation Results</CardTitle>
                  <CardDescription>
                    Test ID: {result.test_id || 'N/A'}
                  </CardDescription>
                </div>
                <Button
                  onClick={handleExport}
                  disabled={exportLoading || !result.test_id}
                  variant="outline"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {result.risk_heatmap.summary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">Total Loans</div>
                    <div className="text-2xl font-bold mt-1">
                      {result.risk_heatmap.summary.total_loans || 0}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg border-red-200 bg-red-50 dark:bg-red-950/20">
                    <div className="text-sm text-muted-foreground">Breached</div>
                    <div className="text-2xl font-bold mt-1 text-red-600 dark:text-red-400">
                      {result.risk_heatmap.summary.loans_breached || 0}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
                    <div className="text-sm text-muted-foreground">At Risk</div>
                    <div className="text-2xl font-bold mt-1 text-yellow-600 dark:text-yellow-400">
                      {result.risk_heatmap.summary.loans_at_risk || 0}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg border-green-200 bg-green-50 dark:bg-green-950/20">
                    <div className="text-sm text-muted-foreground">Safe</div>
                    <div className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400">
                      {result.risk_heatmap.summary.loans_safe || 0}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Breach Timeline Visualization - NEW: Interactive timeline with Gantt-style bars */}
        <BreachTimeline
          loans={allLoans as any}
          ebitdaDropPercent={localEbitdaDrop}
          interestRateHikeBps={localRateHike}
        />
      </div>
    </DashboardLayout>
  );
};

export default Simulator;
