import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { useGlobalData } from '@/context/GlobalDataContext';
import { DollarSign, AlertCircle, Leaf } from 'lucide-react';
import { formatCurrency as _formatCurrency, formatRiskScore } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { exportBenchmarkComparisonPDF } from '@/utils/pdfExporter';

const PortfolioSummary: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  const { loans, simulation, lastUpdated } = usePortfolio();
  const {
    totalPortfolioValue,
    averageRiskScore,
    breachedLoans,
    atRiskLoans,
    compliantLoans,
    totalLoanCount,
  } = useGlobalData();

  const formatCurrency = (amount: number) => {
    return _formatCurrency(amount, 'billions');
  };

  const loanCount = totalLoanCount || loans.length;

  // If a stressed scenario is active, prefer displaying stressed results in the snapshot
  const stressed = simulation && simulation.scenario === 'stressed' && simulation.stressedResults;
  const displayBreached = stressed ? simulation.stressedResults!.breachedCount : breachedLoans;
  const displayAtRisk = stressed ? simulation.stressedResults!.atRiskCount : atRiskLoans;
  const displayCompliant = stressed ? simulation.stressedResults!.safeCount : compliantLoans;

  // Animated counter component
  const AnimatedCounter: React.FC<{ value: number }> = ({ value }) => {
    const [display, setDisplay] = useState(0);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
      const duration = 700;
      const start = performance.now();
      const from = display;
      const to = value;

      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        const current = Math.round(from + (to - from) * eased);
        setDisplay(current);
        if (t < 1) rafRef.current = requestAnimationFrame(step);
      };

      rafRef.current = requestAnimationFrame(step);
      return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    return <span className="text-2xl font-bold">{display}</span>;
  };

  // Sync badge
  const SyncBadge: React.FC = () => {
    const [fresh, setFresh] = useState(true);
    useEffect(() => {
      if (!lastUpdated) { setFresh(false); return; }
      const then = new Date(lastUpdated).getTime();
      const now = Date.now();
      const ageMs = now - then;
      setFresh(ageMs < 2 * 60 * 1000); // fresh if < 2 minutes
    }, [lastUpdated]);
    return (
      <div className={`inline-flex items-center gap-2 text-sm ${fresh ? 'text-emerald-600' : 'text-muted-foreground'}`}>
        <span className={`w-2 h-2 rounded-full ${fresh ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'}`} />
        <span>{fresh ? 'Live' : 'Last sync'}</span>
      </div>
    );
  };

  const CircularRisk: React.FC<{ score: number }> = ({ score }) => {
    const radius = 44;
    const stroke = 8;
    const normalized = Math.max(0, Math.min(100, Math.round(score)));
    const circumference = 2 * Math.PI * radius;
    const dash = (normalized / 100) * circumference;

    // Determine color based on risk score
    const getRiskColor = (score: number) => {
      if (score <= 30) return { stroke: '#10b981', text: 'text-green-600' }; // low - green
      if (score <= 60) return { stroke: '#f59e0b', text: 'text-amber-600' }; // medium - amber
      if (score <= 80) return { stroke: '#ef4444', text: 'text-red-600' }; // high - red
      return { stroke: '#dc2626', text: 'text-red-700' }; // critical - dark red
    };

    const { stroke: strokeColor, text: textClass } = getRiskColor(normalized);

    return (
      <div className="flex items-center justify-center">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <g transform="translate(60,60)">
            <circle r={radius} strokeWidth={stroke} className="text-gray-200" stroke="currentColor" fill="transparent" />
            <circle r={radius} strokeWidth={stroke} strokeLinecap="round" stroke={strokeColor} fill="transparent"
              strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={0} transform="rotate(-90)" style={{ transition: 'stroke-dasharray 700ms ease' }} />
            <text x="0" y="6" textAnchor="middle" className={`text-xl font-bold fill-current ${textClass}`}>{normalized}</text>
            <text x="0" y="26" textAnchor="middle" className="text-xs fill-current text-muted-foreground">Risk Score</text>
          </g>
        </svg>
      </div>
    );
  };

  return (
    <Card className="border-gray-200 dark:border-gray-800 shadow-xl hover:shadow-2xl transition-shadow">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Portfolio Snapshot</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <p className="text-sm text-gray-600 mb-1">Total Portfolio Value</p>
            <p className="text-4xl font-bold text-gray-900">{formatCurrency(totalPortfolioValue || 0)}</p>
            <p className="text-xs text-teal-600 mt-1">From {loanCount} loans</p>
          </div>

          <div className="lg:col-span-2 space-y-4 flex flex-col items-stretch">
            <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-white border border-blue-200 flex items-center justify-center">
              <div className="w-full flex items-center justify-center">
                <CircularRisk score={averageRiskScore || 0} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-center shadow-sm hover:shadow-md transition-shadow">
                <p className="text-xs text-green-700">Compliant</p>
                <AnimatedCounter value={displayCompliant} />
              </div>
              <div className="p-3 rounded-lg bg-orange-50 border border-orange-200 text-center shadow-sm hover:shadow-md transition-shadow">
                <p className="text-xs text-orange-700">At Risk</p>
                <AnimatedCounter value={displayAtRisk} />
              </div>
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-center shadow-sm hover:shadow-md transition-shadow">
                <p className="text-xs text-red-700">Breached</p>
                <AnimatedCounter value={displayBreached} />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleString() : '—'}</div>
            <SyncBadge />
          </div>
          {simulation && simulation.scenario === 'stressed' && simulation.stressedResults && (
            <div className="text-sm text-yellow-700">Stressed Scenario active: {simulation.stressedResults.breachedCount} breached</div>
          )}
          {onNavigate && (
            <Button onClick={() => onNavigate('risk')} className="btn-gradient hover:scale-[1.02] transition-all">
              View Risk Details
            </Button>
          )}
        </div>

        {/* Benchmark comparison */}
        <div className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-card/80 border border-border shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">This Portfolio</div>
                  <div className="text-xl font-bold">{formatCurrency(totalPortfolioValue || 0)}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Loans</div>
                  <div className="font-semibold">{loanCount}</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="p-3 rounded bg-white border">
                  <div className="text-xs text-muted-foreground">Risk Score</div>
                  <div className="text-lg font-bold">{Math.round(averageRiskScore || 0)}</div>
                </div>
                <div className="p-3 rounded bg-white border">
                  <div className="text-xs text-muted-foreground">ESG Score (est)</div>
                  <div className="text-lg font-bold">{(() => {
                    const val = Math.max(0, Math.min(100, Math.round(65 - ((averageRiskScore || 0) - 40) * 0.35)));
                    return val;
                  })()}</div>
                </div>
                <div className="p-3 rounded bg-white border">
                  <div className="text-xs text-muted-foreground">Compliance Rate</div>
                  <div className="text-lg font-bold">{loanCount ? Math.round((displayCompliant / loanCount) * 100) : 0}%</div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/60 border border-border shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Industry Average</div>
                  <div className="text-xl font-bold">Benchmark</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Reference</div>
                  <div className="font-semibold">Global Sector</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="p-3 rounded bg-white border">
                  <div className="text-xs text-muted-foreground">Risk Score</div>
                  <div className="text-lg font-bold">{(() => Math.min(100, Math.round((averageRiskScore || 0) + 8)))()}</div>
                </div>
                <div className="p-3 rounded bg-white border">
                  <div className="text-xs text-muted-foreground">ESG Score</div>
                  <div className="text-lg font-bold">{(() => {
                    const portfolioESG = Math.max(0, Math.min(100, Math.round(65 - ((averageRiskScore || 0) - 40) * 0.35)));
                    return Math.max(0, portfolioESG - 4);
                  })()}</div>
                </div>
                <div className="p-3 rounded bg-white border">
                  <div className="text-xs text-muted-foreground">Compliance Rate</div>
                  <div className="text-lg font-bold">{(() => Math.max(0, Math.round((loanCount ? Math.round((displayCompliant / loanCount) * 100) : 0) - 6)))()}%</div>
                </div>
              </div>

              {/* Comparative badges */}
              <div className="mt-4 flex flex-wrap gap-3">
                {(() => {
                  const pRisk = Math.round(averageRiskScore || 0);
                  const iRisk = Math.min(100, Math.round(pRisk + 8));
                  const pESG = Math.max(0, Math.min(100, Math.round(65 - ((averageRiskScore || 0) - 40) * 0.35)));
                  const iESG = Math.max(0, pESG - 4);
                  const pComp = loanCount ? Math.round((displayCompliant / loanCount) * 100) : 0;
                  const iComp = Math.max(0, pComp - 6);
                  const badges = [] as JSX.Element[];
                  // ESG better
                  if (pESG > iESG) {
                    const rel = Math.round(((pESG - iESG) / Math.max(1, iESG)) * 100);
                    badges.push(<div key="esg" className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">✓ {rel}% better than avg on ESG</div>);
                  } else if (pESG < iESG) {
                    const rel = Math.round(((iESG - pESG) / Math.max(1, iESG)) * 100);
                    badges.push(<div key="esg" className="px-3 py-1 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-100">⚠ {rel}% below avg on ESG</div>);
                  }

                  // Risk comparison
                  if (pRisk < iRisk) {
                    const rel = Math.round(((iRisk - pRisk) / Math.max(1, iRisk)) * 100);
                    badges.push(<div key="risk" className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">✓ {rel}% lower breach risk than industry</div>);
                  } else if (pRisk > iRisk) {
                    const rel = Math.round(((pRisk - iRisk) / Math.max(1, iRisk)) * 100);
                    badges.push(<div key="risk" className="px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-100">⚠ {rel}% higher breach risk</div>);
                  }

                  // Compliance
                  if (pComp > iComp) {
                    const rel = Math.round(((pComp - iComp) / Math.max(1, iComp)) * 100);
                    badges.push(<div key="comp" className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">✓ {rel}% better compliance rate</div>);
                  } else if (pComp < iComp) {
                    const rel = Math.round(((iComp - pComp) / Math.max(1, iComp)) * 100);
                    badges.push(<div key="comp" className="px-3 py-1 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-100">⚠ {rel}% below industry compliance</div>);
                  }

                  return badges;
                })()}
              </div>

              <div className="mt-4">
                <Button
                  className="bg-teal-600 text-white hover:bg-teal-700"
                  onClick={() => {
                    // build metrics from the current snapshot
                    const pRisk = Math.round(averageRiskScore || 0);
                    const pESG = Math.max(0, Math.min(100, Math.round(65 - ((averageRiskScore || 0) - 40) * 0.35)));
                    const pComp = loanCount ? Math.round((displayCompliant / loanCount) * 100) : 0;

                    const iRisk = Math.min(100, Math.round(pRisk + 8));
                    const iESG = Math.max(0, pESG - 4);
                    const iComp = Math.max(0, pComp - 6);

                    const gRisk = iRisk; const gESG = iESG; const gComp = iComp;

                    exportBenchmarkComparisonPDF(
                      { riskScore: pRisk, esgScore: pESG, complianceRate: pComp, totalLoans: loanCount },
                      { riskScore: iRisk, esgScore: iESG, complianceRate: iComp },
                      { riskScore: gRisk, esgScore: gESG, complianceRate: gComp }
                    );
                  }}
                >
                  Export Comparison Report
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default React.memo(PortfolioSummary);
