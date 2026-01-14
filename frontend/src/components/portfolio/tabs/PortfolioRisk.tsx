/**
 * Portfolio Risk Tab
 * 2-column grid of Loan Risk Cards, Recommendations, Covenant Breach Timeline
 * Filter/Search by sector, status, ESG score
 */
import { useState, useMemo, useEffect } from 'react';
import { useGreenGaugeStore } from '@/store/useGreenGaugeStore';
import { usePortfolioStatus } from '@/hooks/usePortfolioStatus';
import { useGlobalData } from '@/context/GlobalDataContext';
import LoanCard from '../components/LoanCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Download, Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import BreachTimelineChart from '../charts/BreachTimelineChart';
import LoanDetailModal from '../components/LoanDetailModal';
import { calculateStressedGreenScore } from '@/lib/greenScore';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { matchesQuery } from '@/lib/searchUtils';

interface PortfolioRiskProps {
  onNavigate: (tab: string) => void;
}

const PortfolioRisk = ({ onNavigate }: PortfolioRiskProps) => {
  const { ebitdaDropPercent, interestRateHikeBps } = useGreenGaugeStore();
  const { allLoans, breachedLoans, atRiskLoans, compliantLoans } = useGlobalData();
  const portfolioStatus = usePortfolioStatus(allLoans as any, ebitdaDropPercent, interestRateHikeBps);
  const { lastUpdated } = usePortfolio() as any;
  const [selectedLoan, setSelectedLoan] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'BREACHED' | 'AT_RISK' | 'SAFE'>('all');
  const [filterSector, setFilterSector] = useState<string>('all');
  const [filterCovenantType, setFilterCovenantType] = useState<string>('all');
  const [minESGScore, setMinESGScore] = useState<number>(0);
  const [savedFilters, setSavedFilters] = useState<any[]>(() => {
    try {
      const raw = localStorage.getItem('savedRiskFilters');
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  });
  const [showSavedDropdown, setShowSavedDropdown] = useState(false);
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const formatRelative = (d: Date | string | null) => {
    if (!d) return 'N/A';
    const then = typeof d === 'string' ? new Date(d) : d;
    const diff = Math.floor((now.getTime() - then.getTime()) / 1000);
    if (diff < 5) return 'just now';
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  const applySavedFilter = (idx: number) => {
    const f = savedFilters[idx];
    if (!f) return;
    setFilterStatus(f.filterStatus || 'all');
    setFilterSector(f.filterSector || 'all');
    setFilterCovenantType(f.filterCovenantType || 'all');
    setMinESGScore(f.minESGScore || 0);
    setSearchQuery(f.searchQuery || '');
    setShowSavedDropdown(false);
  };

  // Indicate searching state while user types
  useEffect(() => {
    if (!searchQuery) { setIsSearching(false); return; }
    setIsSearching(true);
    const t = setTimeout(() => setIsSearching(false), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const renameSavedFilter = (idx: number) => {
    const f = savedFilters[idx];
    if (!f) return;
    const name = prompt('Rename filter:', f.name);
    if (!name) return;
    const next = savedFilters.slice();
    next[idx] = { ...f, name };
    setSavedFilters(next);
    try { localStorage.setItem('savedRiskFilters', JSON.stringify(next)); } catch (e) {}
  };

  const deleteSavedFilter = (idx: number) => {
    if (!confirm(`Delete saved filter '${savedFilters[idx]?.name}'?`)) return;
    const next = savedFilters.slice();
    next.splice(idx, 1);
    setSavedFilters(next);
    try { localStorage.setItem('savedRiskFilters', JSON.stringify(next)); } catch (e) {}
  };

  // Filter loans based on search, status, sector, and ESG score
  const filteredLoans = useMemo(() => {
    return portfolioStatus.loans.filter(loanStatus => {
      // Search filter
      if (searchQuery) {
        if (!matchesQuery(loanStatus.loan, searchQuery)) return false;
      }

      // Status filter
      if (filterStatus !== 'all' && loanStatus.status !== filterStatus) {
        return false;
      }

      // Sector filter
      if (filterSector !== 'all' && loanStatus.loan.sector !== filterSector) {
        return false;
      }

      // Covenant type filter
      if (filterCovenantType !== 'all') {
        const hasType = (loanStatus.covenants || []).some(c => (c.type || '').toLowerCase() === filterCovenantType.toLowerCase());
        if (!hasType) return false;
      }

      // ESG score filter
      const greenScore = calculateStressedGreenScore(loanStatus.loan, ebitdaDropPercent, interestRateHikeBps);
      if (greenScore < minESGScore) {
        return false;
      }

      return true;
    });
  }, [portfolioStatus.loans, searchQuery, filterStatus, filterSector, minESGScore, ebitdaDropPercent, interestRateHikeBps]);

  const sectors = Array.from(new Set(allLoans.map(l => l.sector)));
  const covenantTypes = Array.from(new Set(allLoans.flatMap(l => (l.covenants || []).map((c: any) => c.type || 'financial'))));

  const recommendations = [
    {
      priority: 'CRITICAL',
      title: 'Immediate Covenant Waiver Required',
      description: `${portfolioStatus.breachedLoanCount} loans require urgent syndicate agent intervention`,
      count: portfolioStatus.breachedLoanCount,
      color: 'bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-900 text-red-900 dark:text-red-100'
    },
    {
      priority: 'HIGH',
      title: 'Enhanced Monitoring Needed',
      description: `${portfolioStatus.atRiskLoanCount} loans within 10% of breach threshold`,
      count: portfolioStatus.atRiskLoanCount,
      color: 'bg-orange-50 dark:bg-orange-950/20 border-orange-300 dark:border-orange-900 text-orange-900 dark:text-orange-100'
    },
    {
      priority: 'MEDIUM',
      title: 'Regular Review Schedule',
      description: `${portfolioStatus.safeLoanCount} loans stable but require quarterly reviews`,
      count: portfolioStatus.safeLoanCount,
      color: 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-300 dark:border-yellow-900 text-yellow-900 dark:text-yellow-100'
    },
    {
      priority: 'LOW',
      title: 'Maintain Current Trajectory',
      description: 'Portfolio overall health within acceptable parameters',
      count: 0,
      color: 'bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-900 text-green-900 dark:text-green-100'
    }
  ];

  return (
    <div className="space-y-6" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Back Link & Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate('summary')}
            className="flex items-center gap-2 text-sm font-medium transition-colors"
            style={{ color: '#06A77D' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#059669'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#06A77D'}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Summary
          </button>

          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2" style={{ fontSize: '24px' }}>
              Portfolio Risk Analysis <span className="badge-live ml-3">Enterprise Ready</span>
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-0">
              Visual overview of covenant status. Adjust sliders to stress test scenarios.
            </p>
          </div>
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-400">
          Last refresh: <span className="font-medium">{formatRelative(lastUpdated)} ago</span>
        </div>
      </div>

      {/* Quick Filters Bar */}
      <Card className="border-gray-200 dark:border-gray-800" style={{ 
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        borderRadius: '12px'
      }}>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <Filter className="w-5 h-5 text-gray-400" />
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-900"
              style={{ borderRadius: '8px' }}
            >
              <option value="all">All Status</option>
              <option value="BREACHED">Breached</option>
              <option value="AT_RISK">At Risk</option>
              <option value="SAFE">Safe</option>
            </select>

            <select
              value={filterSector}
              onChange={(e) => setFilterSector(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-900"
              style={{ borderRadius: '8px' }}
            >
              <option value="all">All Sectors</option>
              {sectors.map(sector => (
                <option key={sector} value={sector}>{sector}</option>
              ))}
            </select>

            <select
              value={filterCovenantType}
              onChange={(e) => setFilterCovenantType(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-900"
              style={{ borderRadius: '8px' }}
            >
              <option value="all">All Covenant Types</option>
              {['financial','esg','operational','sustainability', ...covenantTypes].filter((v,i,arr)=>arr.indexOf(v)===i).map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>

            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by company name or sector..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                style={{ borderRadius: '8px' }}
              />
              <div className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                {isSearching ? (<em>Searching...</em>) : (<span>Found <strong>{filteredLoans.length}</strong> loans{searchQuery ? <> matching "<em>{searchQuery}</em>"</> : ''}</span>)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">Min ESG:</label>
              <Input
                type="number"
                min={0}
                max={100}
                value={minESGScore}
                onChange={(e) => setMinESGScore(Number(e.target.value))}
                className="w-20"
                style={{ borderRadius: '8px' }}
              />
            </div>
            <div className="flex items-center gap-2 relative">
              <button
                className="px-3 py-2 bg-primary text-white rounded-md text-sm"
                onClick={() => {
                  const name = prompt('Save filter as:');
                  if (!name) return;
                  const toSave = { name, filterStatus, filterSector, filterCovenantType, minESGScore, searchQuery };
                  const next = [...savedFilters, toSave];
                  setSavedFilters(next);
                  try { localStorage.setItem('savedRiskFilters', JSON.stringify(next)); } catch (e) {}
                }}
              >
                Save Filter
              </button>

              {savedFilters.length > 0 && (
                <div className="relative">
                  <button
                    className="px-3 py-2 border rounded-md text-sm bg-white dark:bg-gray-900"
                    onClick={() => setShowSavedDropdown(prev => !prev)}
                  >
                    Saved Filters ▾
                  </button>

                  {showSavedDropdown && (
                    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-900 border rounded-md shadow-lg z-50">
                      {savedFilters.map((f, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800">
                          <button className="text-left text-sm truncate" onClick={() => applySavedFilter(i)} title={`Apply ${f.name}`}>
                            {f.name}
                          </button>
                          <div className="flex items-center gap-2">
                            <button className="text-xs text-blue-600" onClick={() => renameSavedFilter(i)}>Rename</button>
                            <button className="text-xs text-red-600" onClick={() => deleteSavedFilter(i)}>Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loan Risk Cards - 2 Column Grid */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4" style={{ fontSize: '24px' }}>
          Loan Portfolio Risk Analysis
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredLoans.length > 0 ? (
            filteredLoans.map((loanStatus) => (
              <LoanCard
                key={loanStatus.loan.id}
                loan={loanStatus.loan}
                ebitdaDropPercent={ebitdaDropPercent}
                interestRateHikeBps={interestRateHikeBps}
                onClick={() => setSelectedLoan(loanStatus.loan.id)}
                highlightQuery={searchQuery}
              />
            ))
          ) : (
            <div className="col-span-2 text-center py-8 text-gray-500 dark:text-gray-400">
              No loans match the current filters
            </div>
          )}
        </div>
      </div>

      {/* Smart Recommendations - Enhanced */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4" style={{ fontSize: '24px' }}>
          AI-Powered Insights
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {recommendations.map((rec) => {
            // Get top breached loan for critical recommendation
            const topBreached = rec.priority === 'CRITICAL' 
              ? portfolioStatus.loans
                  .filter(ls => ls.status === 'BREACHED')
                  .sort((a, b) => b.breachCount - a.breachCount)[0]
              : null;

            return (
              <Card 
                key={rec.priority} 
                className={cn('border-2 cursor-pointer transition-all duration-200 hover:shadow-lg', rec.color)}
                style={{ 
                  borderRadius: '12px',
                  borderLeftWidth: '4px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)';
                }}
                onClick={() => {
                  if (topBreached) setSelectedLoan(topBreached.loan.id);
                }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">{rec.priority}</CardTitle>
                    {rec.count > 0 && (
                      <span className="text-xs font-bold px-2 py-1 rounded-full bg-white/50">
                        {rec.count}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium mb-2">{rec.title}</p>
                  {topBreached && rec.priority === 'CRITICAL' ? (
                    <p className="text-xs opacity-80 mb-2">
                      {topBreached.loan.companyName} {topBreached.worstCovenant} breach: {topBreached.covenants
                        .filter(c => c.isBreached)
                        .map(c => `${Math.abs(c.breachMargin / c.threshold * 100).toFixed(1)}%`)
                        .join(', ')}
                    </p>
                  ) : (
                    <p className="text-xs opacity-80 mb-2">{rec.description}</p>
                  )}
                  {rec.count > 0 && (
                    <p className="text-lg font-bold mt-2">{rec.count} loans</p>
                  )}
                  <button className="text-xs font-medium mt-3 flex items-center gap-1 hover:gap-2 transition-all">
                    View Details →
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Covenant Breach Timeline */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Covenant Breach Timeline
        </h2>
        <Card className="border-gray-200 dark:border-gray-800">
          <CardContent className="p-6">
            <BreachTimelineChart
              loans={allLoans}
              ebitdaDropPercent={ebitdaDropPercent}
              interestRateHikeBps={interestRateHikeBps}
              onLoanClick={(id: string) => setSelectedLoan(id)}
            />
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          onClick={() => onNavigate('stress')}
          className="btn-gradient flex-1 h-12"
        >
          Run Stress Test
        </Button>
        <Button
          className="btn-gradient flex-1 h-12"
        >
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Loan Detail Modal */}
      {selectedLoan && (
        <LoanDetailModal
          loanId={selectedLoan}
          onClose={() => setSelectedLoan(null)}
        />
      )}
    </div>
  );
};

export default PortfolioRisk;

