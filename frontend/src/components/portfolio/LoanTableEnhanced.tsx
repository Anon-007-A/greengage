/**
 * Enhanced Loan Table with Sorting, Pagination, Filters, and Mobile Responsiveness
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Loan } from '@/lib/api-enhanced';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { matchesQuery } from '@/lib/searchUtils';
import { usePortfolioStatus } from '@/hooks/usePortfolioStatus';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigate } from 'react-router-dom';
import { useGreenGaugeStore } from '@/store/useGreenGaugeStore';
import { usePortfolio } from '@/contexts/PortfolioContext';
import Skeleton from '@/components/Skeleton';

type SortField = 'companyName' | 'loanAmount' | 'riskScore' | 'daysToBreachEstimate' | 'status';
type SortOrder = 'asc' | 'desc';
type RiskFilter = 'all' | 'compliant' | 'at_risk' | 'breached';

interface LoanTableEnhancedProps {
  loans: Loan[];
  loading?: boolean;
  onExportPDF?: (loansToExport: Loan[]) => void;
}

export const LoanTableEnhanced = ({ loans, loading = false, onExportPDF }: LoanTableEnhancedProps) => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('gg_page_size');
      return saved ? Number(saved) : 25;
    } catch (e) { return 25; }
  });
  const [sortField, setSortField] = useState<SortField>('companyName');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const globalSearch = useGreenGaugeStore(state => state.searchQuery);
  // Use shared breakpoint hook so layout matches the rest of the app
  const isMobile = useIsMobile();

  const dataSource = loans;

  const { simulation } = usePortfolio();
  const ebitdaDropPercent = simulation?.ebitdaDrop || 0;
  const interestRateHikeBps = simulation?.interestRateHike || 0;
  const portfolioStatus = usePortfolioStatus(loans as any, ebitdaDropPercent, interestRateHikeBps);
  const loanStatusMap = useMemo(() => new Map(portfolioStatus.loans.map((ls: any) => [ls.loan.id, ls.status])), [portfolioStatus.loans]);

  const covenantOptions = useMemo(() => {
    const s = new Set<string>();
    loans.forEach(l => (l as any).covenants?.forEach((c: any) => s.add(c.name || c.type || 'Other')));
    return Array.from(s).slice(0, 12);
  }, [loans]);

  const [covenantFilter, setCovenantFilter] = useState<string>('all');

  // Filtered and sorted loans
  const processedLoans = useMemo(() => {
    let result = [...dataSource];

      // Apply debounced search filter across name, id, amount and covenant names
      if (searchTerm) {
        result = result.filter(loan => matchesQuery(loan, searchTerm));
      }

    // Apply risk filter using computed loan statuses (keeps filters in sync with Simulator)
    if (riskFilter !== 'all') {
      result = result.filter(loan => {
        const computed = (loanStatusMap.get(loan.id) || 'SAFE').toString();
        const mapped = computed === 'SAFE' ? 'compliant' : computed === 'AT_RISK' ? 'at_risk' : 'breached';
        return mapped === riskFilter.toLowerCase();
      });
    }

    // Apply covenant filter (AND logic)
    if (covenantFilter && covenantFilter !== 'all') {
      result = result.filter(loan => (loan.covenants || []).some((c: any) => (c.name || c.type || '').toLowerCase() === covenantFilter.toLowerCase()));
    }

    // Apply sorting
    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === 'riskScore') {
        aVal = (a.riskScore?.overall || 0);
        bVal = (b.riskScore?.overall || 0);
      } else if (sortField === 'daysToBreachEstimate') {
        aVal = Math.min(...(a.covenants?.map((c: any) => c.daysToBreachEstimate || 9999) || [9999]));
        bVal = Math.min(...(b.covenants?.map((c: any) => c.daysToBreachEstimate || 9999) || [9999]));
      }

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [loans, searchTerm, riskFilter, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(processedLoans.length / pageSize));
  const paginatedLoans = processedLoans.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="w-4 h-4 opacity-40" />;
    return sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  const getStatusColor = (status: string | undefined) => {
    const s = status?.toLowerCase() || 'compliant';
    if (s === 'breached') return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200';
    if (s === 'at_risk') return 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200';
    return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200';
  };

  // Highlight matching terms in text (simple client-side highlighter)
  const renderHighlighted = (text: string, rawQuery: string) => {
    if (!rawQuery || !text) return text;
    const terms = rawQuery.toString().trim().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return text;
    // escape regex
    const escaped = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const re = new RegExp('(' + escaped.join('|') + ')', 'gi');
    const parts = String(text).split(re);
    return (
      <span>
        {parts.map((part, i) => (
          re.test(part) ? <mark key={i} className="bg-yellow-100 text-yellow-900 px-0.5 rounded">{part}</mark> : <span key={i}>{part}</span>
        ))}
      </span>
    );
  };

  const getRiskDelta = (loan: any) => {
    const hist = loan.riskScore?.history || loan.riskScore?.history30 || null;
    if (Array.isArray(hist) && hist.length >= 2) {
      const first = Number(hist[0]) || 0;
      const last = Number(hist[hist.length - 1]) || 0;
      return Math.round((last - first) * 10) / 10;
    }
    if (typeof loan.riskScore?.delta30 === 'number') return loan.riskScore.delta30;
    return null;
  };

  // Debounce local search input into effective searchTerm used by filters
  useEffect(() => {
    setIsSearching(true);
    const t = setTimeout(() => {
      setSearchTerm(searchInput.trim());
      setCurrentPage(1);
      setIsSearching(false);
    }, 300);
    return () => { clearTimeout(t); setIsSearching(false); };
  }, [searchInput]);

  // If global (top) search changes, clear table-local search input
  useEffect(() => {
    if (globalSearch && globalSearch.length > 0) {
      setSearchInput('');
      setSearchTerm('');
    }
  }, [globalSearch]);

  // Persist page size
  useEffect(() => {
    try { localStorage.setItem('gg_page_size', String(pageSize)); } catch (e) {}
  }, [pageSize]);

  const Row = useCallback(({ index, style }: { index: number; style: any }) => {
    const loan = paginatedLoans[index];
    if (!loan) return null;
    const primaryCov = loan.covenants?.[0]?.name || '-';
    const daysToBreach = Math.min(...(loan.covenants?.map((c: any) => c.daysToBreachEstimate || 9999) || [9999]));
    return (
      <div style={style} className="flex items-center border-b px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer" onClick={() => navigate(`/loan/${loan.id}`)}>
        <div className="w-1/3 font-medium text-gray-900 dark:text-gray-100">{loan.companyName}</div>
        <div className="w-1/6">{(loan.loanAmount / 1_000_000).toFixed(1)}M</div>
        <div className="w-1/6 text-gray-600 dark:text-gray-400">{primaryCov}</div>
        <div className="w-1/6"><span className={cn('text-xs font-semibold', getStatusColor(loan.status))}>{loan.status || 'COMPLIANT'}</span></div>
        <div className="w-1/6 text-right">{loan.riskScore?.overall ?? 'N/A'}</div>
      </div>
    );
  }, [paginatedLoans, navigate]);

  // Desktop Table View
  if (loading && !isMobile) {
    return (
      <Card className="w-full border-gray-200 dark:border-gray-800">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle>Loan Portfolio</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <Skeleton rows={6} />
        </CardContent>
      </Card>
    );
  }

  if (!isMobile) {
    return (
      <Card className="w-full border-gray-200 dark:border-gray-800">
        <CardHeader className="border-b">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>Loan Portfolio ({processedLoans.length})</CardTitle>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search by company, loan ID, amount or covenant..."
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm dark:bg-gray-800 dark:border-gray-600"
                />
                <div className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                  {isSearching ? (
                    <span className="italic">Searching...</span>
                  ) : (
                    <span>Found <strong>{processedLoans.length}</strong> loans{searchInput ? <> matching "<em>{searchInput}</em>"</> : ''}</span>
                  )}
                </div>
                {searchInput && (
                  <Button size="sm" variant="ghost" onClick={() => { setSearchInput(''); setSearchTerm(''); }}>
                    Clear
                  </Button>
                )}
              </div>

              <select
                value={riskFilter}
                onChange={(e) => {
                  setRiskFilter(e.target.value as RiskFilter);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm dark:bg-gray-800 dark:border-gray-600"
              >
                <option value="all">All Status</option>
                <option value="compliant">Compliant</option>
                <option value="at_risk">At Risk</option>
                <option value="breached">Breached</option>
              </select>

              <select
                value={covenantFilter}
                onChange={(e) => { setCovenantFilter(e.target.value); setCurrentPage(1); }}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm dark:bg-gray-800 dark:border-gray-600"
              >
                <option value="all">All Covenant Types</option>
                {covenantOptions.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('companyName')}>
                    <div className="flex items-center gap-2">
                      Company <SortIcon field="companyName" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('loanAmount')}>
                    <div className="flex items-center gap-2">
                      Amount (€M) <SortIcon field="loanAmount" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Sector</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Covenant Type</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('status')}>
                    <div className="flex items-center gap-2">
                      Status <SortIcon field="status" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Health</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('riskScore')}>
                    <div className="flex items-center gap-2">
                      Risk Score <SortIcon field="riskScore" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('daysToBreachEstimate')}>
                    <div className="flex items-center gap-2">
                      Days-to-Breach <SortIcon field="daysToBreachEstimate" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginatedLoans.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      {searchTerm ? 'No loans match your search.' : 'No loans found matching your filters.'}
                    </td>
                  </tr>
                ) : (
                  paginatedLoans.map((loan: any) => {
                    const primaryCov = loan.covenants?.[0]?.name || '-';
                    const daysToBreach = Math.min(...(loan.covenants?.map((c: any) => c.daysToBreachEstimate || 9999) || [9999]));
                    return (
                      <tr
                        key={loan.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                        onClick={() => navigate(`/loan/${loan.id}`)}
                      >
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{renderHighlighted(loan.companyName, searchInput)}</td>
                        <td className="px-6 py-4">{(loan.loanAmount / 1_000_000).toFixed(1)}M</td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{renderHighlighted(loan.sector || '-', searchInput)}</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{renderHighlighted(primaryCov, searchInput)}</td>
                        <td className="px-6 py-4">
                          <Badge className={cn('text-xs font-semibold', getStatusColor(loan.status))}>
                            {loan.status || 'COMPLIANT'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          {(() => {
                            const riskScore = loan.riskScore?.overall ?? 50;
                            const label = riskScore <= 30 ? 'good' : riskScore <= 70 ? 'medium' : 'bad';
                            const cls = riskScore <= 30 ? 'text-green-700' : riskScore <= 70 ? 'text-yellow-700' : 'text-red-700';
                            return <span className={`${cls} text-sm font-medium`}>{label}</span>;
                          })()}
                        </td>
                        <td className="px-6 py-4 font-medium">
                          {(() => {
                            const val = loan.riskScore?.overall ?? 'N/A';
                            const trend = loan.riskScore?.trend || 'stable';
                            const arrow = trend === 'improving' ? '↑' : trend === 'deteriorating' ? '↓' : '→';
                            const delta = getRiskDelta(loan);
                            const deltaText = delta !== null ? ` (${delta >= 0 ? '+' : ''}${delta} pts in 30d)` : '';
                            return (
                              <span title={`Trend: ${trend}${deltaText}`}>{arrow} {val}</span>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4">
                          {daysToBreach === 9999 ? '-' : (
                            (() => {
                              const cls = daysToBreach > 90 ? 'text-green-600' : daysToBreach > 30 ? 'text-yellow-600' : 'text-red-600';
                              return <span className={cls}>{`${daysToBreach}d`}</span>;
                            })()
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 border border-gray-300 rounded text-sm dark:bg-gray-800 dark:border-gray-600"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            <span className="text-sm text-gray-600 dark:text-gray-400">
              Page {currentPage} of {totalPages} ({processedLoans.length} total)
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const p = idx + 1;
                  return (
                    <Button
                      key={p}
                      size="sm"
                      variant={p === currentPage ? 'default' : 'outline'}
                      onClick={() => setCurrentPage(p)}
                      className={`${p === currentPage ? 'bg-teal-600 text-white' : ''} transition-colors duration-150`}
                      aria-current={p === currentPage}
                    >
                      {p}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>

            {onExportPDF && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExportPDF(processedLoans)}
              >
                Export PDF
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Mobile Card View
  if (loading) {
    return (
      <Card className="w-full border-gray-200 dark:border-gray-800">
        <CardHeader className="border-b">
          <CardTitle>Loan Portfolio</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <Skeleton rows={4} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full border-gray-200 dark:border-gray-800">
      <CardHeader className="border-b">
        <div className="space-y-3">
          <CardTitle>Loan Portfolio ({processedLoans.length})</CardTitle>
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search..."
                value={searchInput}
                onChange={(e) => { setSearchInput(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm dark:bg-gray-800 dark:border-gray-600"
              />
              {searchInput && (
                <Button size="sm" variant="ghost" onClick={() => { setSearchInput(''); setSearchTerm(''); }}>
                  Clear
                </Button>
              )}
            </div>
            <select
              value={riskFilter}
              onChange={(e) => { setRiskFilter(e.target.value as RiskFilter); setCurrentPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm dark:bg-gray-800 dark:border-gray-600"
            >
              <option value="all">All Status</option>
              <option value="compliant">Compliant</option>
              <option value="at_risk">At Risk</option>
              <option value="breached">Breached</option>
            </select>
            <select
              value={covenantFilter}
              onChange={(e) => { setCovenantFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm dark:bg-gray-800 dark:border-gray-600"
            >
              <option value="all">All Covenant Types</option>
              {covenantOptions.map(c => (<option key={c} value={c}>{c}</option>))}
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {paginatedLoans.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No loans found.</div>
        ) : (
          paginatedLoans.map((loan: any) => {
            const primaryCov = loan.covenants?.[0]?.name || '-';
            const daysToBreach = Math.min(...(loan.covenants?.map((c: any) => c.daysToBreachEstimate || 9999) || [9999]));
            return (
              <div
                key={loan.id}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md cursor-pointer transition-shadow"
                onClick={() => navigate(`/loan/${loan.id}`)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">{loan.companyName}</h3>
                  <Badge className={cn('text-xs', getStatusColor(loan.status))}>
                    {loan.status || 'COMPLIANT'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Amount</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">€{(loan.loanAmount / 1_000_000).toFixed(1)}M</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Risk Score</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{(() => { const val = loan.riskScore?.overall ?? 'N/A'; const trend = loan.riskScore?.trend || 'stable'; const arrow = trend === 'improving' ? '↑' : trend === 'deteriorating' ? '↓' : '→'; const delta = getRiskDelta(loan); const deltaText = delta !== null ? ` (${delta >= 0 ? '+' : ''}${delta} pts in 30d)` : ''; return <span title={`Trend: ${trend}${deltaText}`}>{arrow} {val}</span>; })()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Covenant</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-xs">{primaryCov}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Days-to-Breach</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{daysToBreach === 9999 ? '-' : (() => { const cls = daysToBreach > 90 ? 'text-green-600' : daysToBreach > 30 ? 'text-yellow-600' : 'text-red-600'; return <span className={cls}>{`${daysToBreach}d`}</span>; })()}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Mobile Pagination */}
        <div className="flex flex-col gap-2 pt-4 border-t">
          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Prev
            </Button>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 border border-gray-300 rounded text-sm dark:bg-gray-800 dark:border-gray-600"
            >
              <option value={5}>5 rows</option>
              <option value={10}>10 rows</option>
              <option value={25}>25 rows</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
          {onExportPDF && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => onExportPDF(processedLoans)}
            >
              Export PDF
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
