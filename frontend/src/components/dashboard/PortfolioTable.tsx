/**
 * Portfolio Data Table Component
 * Sortable, filterable table of all loans with key metrics
 */
import { useState, useMemo } from 'react';
import { GreenLoan } from '@/types/greenLoan';
import { usePortfolioStatus } from '@/hooks/usePortfolioStatus';
import { predictPortfolioBreachTimelines } from '@/utils/breachTimelinePredictor';
import { ChevronUp, ChevronDown, TrendingUp, TrendingDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface PortfolioTableProps {
  loans: GreenLoan[];
  ebitdaDropPercent?: number;
  interestRateHikeBps?: number;
}

type SortColumn = 'name' | 'sector' | 'value' | 'covenant' | 'current' | 'threshold' | 'cushion' | 'status' | 'days' | 'esg' | 'trend';
type SortDirection = 'asc' | 'desc';

export function PortfolioTable({ loans, ebitdaDropPercent = 0, interestRateHikeBps = 0 }: PortfolioTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'SAFE' | 'AT_RISK' | 'BREACHED'>('all');
  const [filterSector, setFilterSector] = useState<string>('all');

  const portfolioStatus = usePortfolioStatus(loans, ebitdaDropPercent, interestRateHikeBps);

  // Get unique sectors
  const sectors = useMemo(() => {
    const uniqueSectors = new Set(loans.map(l => l.sector));
    return Array.from(uniqueSectors).sort();
  }, [loans]);

  // Build table data from portfolio status
  const tableData = useMemo(() => {
    // build a map of loanId -> earliest days-to-breach using the predictor
    const timelines = predictPortfolioBreachTimelines(loans, { ebitdaDrop: ebitdaDropPercent, rateHike: interestRateHikeBps });
    const earliestDaysMap = new Map<string, number>();
    timelines.forEach(t => {
      const days = t.estimatedWeeksToBreachQuarterly > 0 ? Math.round(t.estimatedWeeksToBreachQuarterly * 7) : null;
      if (days !== null) {
        const prev = earliestDaysMap.get(t.loanId);
        if (prev === undefined || days < prev) earliestDaysMap.set(t.loanId, days);
      }
    });

    return portfolioStatus.loans.map(loanStatus => {
      const loan = loanStatus.loan;
      const worstCovenant = loanStatus.covenants.length > 0 
        ? loanStatus.covenants.reduce((worst, cov) => {
            const worstSeverity = worst.isBreached ? 2 : worst.isAtRisk ? 1 : 0;
            const covSeverity = cov.isBreached ? 2 : cov.isAtRisk ? 1 : 0;
            return covSeverity > worstSeverity ? cov : worst;
          })
        : null;

      const covenantType = worstCovenant?.name || 'N/A';
      const currentRatio = worstCovenant?.stressedValue ?? worstCovenant?.currentValue ?? 0;
      const threshold = worstCovenant?.threshold || 0;

      // % Cushion per spec: ((Current - Threshold) / Threshold) * 100
      const cushion = threshold !== 0 ? ((currentRatio - threshold) / threshold) * 100 : 0;

      const daysToBreak = earliestDaysMap.get(loan.id) ?? null;

      // Calculate ESG score from loan data
      const esgMetricsProgress = loan.esgMetrics.map(m => m.progressPercent);
      const esgScore = esgMetricsProgress.length > 0 
        ? Math.round(esgMetricsProgress.reduce((a, b) => a + b, 0) / esgMetricsProgress.length)
        : 0;

      // Calculate trend (simplified: down if covenants worsening)
      const trend = loanStatus.status === 'BREACHED' ? 'down' : 
                    loanStatus.status === 'AT_RISK' ? 'down' :
                    'up';

      return {
        id: loan.id,
        name: loan.companyName,
        sector: loan.sector,
        value: loan.loanAmount / 1000000, // Convert to EUR millions
        covenantType,
        currentRatio,
        threshold,
        cushion,
        status: loanStatus.status,
        daysToBreak,
        esgScore,
        trend,
      };
    });
  }, [portfolioStatus]);

  // CSV export for filtered view
  const handleCsvExport = () => {
    const headers = ['Loan Name','Sector','Value (EUR M)','Covenant','Current','Threshold','% Cushion','Status','Days-to-Breach','ESG Score','Trend'];
    const rows = filteredData.map(r => [
      r.name,
      r.sector,
      r.value.toFixed(1),
      r.covenantType,
      r.currentRatio.toFixed(2),
      r.threshold.toFixed(2),
      r.cushion.toFixed(1),
      r.status,
      r.daysToBreak ? `${r.daysToBreak}d` : '',
      `${r.esgScore}/100`,
      r.trend
    ]);

    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio_filtered_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter and sort data
  const filteredData = useMemo(() => {
    let result = tableData.filter(row => {
      const matchesSearch = row.name.toLowerCase().includes(searchText.toLowerCase());
      const matchesStatus = filterStatus === 'all' || row.status === filterStatus;
      const matchesSector = filterSector === 'all' || row.sector === filterSector;
      return matchesSearch && matchesStatus && matchesSector;
    });

    // Sort
    result.sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];

      // Handle null values
      if (aVal == null) aVal = sortColumn === 'esg' ? -1 : sortColumn === 'value' ? 0 : '';
      if (bVal == null) bVal = sortColumn === 'esg' ? -1 : sortColumn === 'value' ? 0 : '';

      // Compare
      let comparison = 0;
      if (typeof aVal === 'string') {
        comparison = aVal.localeCompare(bVal as string);
      } else {
        comparison = (aVal as number) - (bVal as number);
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [tableData, searchText, filterStatus, filterSector, sortColumn, sortDirection]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      'SAFE': 'bg-green-100 text-green-800 border-green-300',
      'AT_RISK': 'bg-amber-100 text-amber-800 border-amber-300',
      'BREACHED': 'bg-red-100 text-red-800 border-red-300',
    };
    const labels = {
      'SAFE': 'Safe',
      'AT_RISK': 'At Risk',
      'BREACHED': 'Breached',
    };
    return {
      color: colors[status as keyof typeof colors] || '',
      label: labels[status as keyof typeof labels] || status,
    };
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  return (
    <Card className="mt-6 border-0 shadow-md">
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <CardTitle>Loan Portfolio</CardTitle>
            <CardDescription>
              {filteredData.length} of {tableData.length} loans
            </CardDescription>
          </div>
          <Input
            type="text"
            placeholder="Search loans..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full md:w-64 h-9 text-sm"
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col md:flex-row flex-wrap gap-3 pb-4 border-b">
          {/* Status Filter */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-2 w-full md:w-auto">
            <span className="text-sm font-medium text-gray-600">Status:</span>
            <div className="flex gap-1 flex-wrap">
              {['all', 'SAFE', 'AT_RISK', 'BREACHED'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status as any)}
                  className={`px-2 md:px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                    filterStatus === status
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {status === 'all' ? 'All' : status === 'AT_RISK' ? 'At Risk' : status}
                </button>
              ))}
            </div>
          </div>

          {/* Sector Filter */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-2 w-full md:w-auto">
            <span className="text-sm font-medium text-gray-600">Sector:</span>
            <select
              value={filterSector}
              onChange={(e) => setFilterSector(e.target.value)}
              className="px-2 py-1 text-xs border border-gray-300 rounded-md bg-white w-full md:w-auto"
            >
              <option value="all">All Sectors</option>
              {sectors.map(sector => (
                <option key={sector} value={sector}>{sector}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table - Desktop view */}
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-300 bg-gray-50">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-1 hover:text-gray-900 cursor-pointer"
                  >
                    Loan Name
                    <SortIcon column="name" />
                  </button>
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  <button
                    onClick={() => handleSort('sector')}
                    className="flex items-center gap-1 hover:text-gray-900 cursor-pointer"
                  >
                    Sector
                    <SortIcon column="sector" />
                  </button>
                </th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">
                  <button
                    onClick={() => handleSort('value')}
                    className="flex items-center justify-end gap-1 hover:text-gray-900 cursor-pointer w-full"
                  >
                    Value (€M)
                    <SortIcon column="value" />
                  </button>
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 text-xs">
                  <button
                    onClick={() => handleSort('covenant')}
                    className="flex items-center gap-1 hover:text-gray-900 cursor-pointer"
                  >
                    Covenant
                    <SortIcon column="covenant" />
                  </button>
                </th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">
                  <button
                    onClick={() => handleSort('current')}
                    className="flex items-center justify-end gap-1 hover:text-gray-900 cursor-pointer w-full"
                  >
                    Current
                    <SortIcon column="current" />
                  </button>
                </th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">
                  <button
                    onClick={() => handleSort('threshold')}
                    className="flex items-center justify-end gap-1 hover:text-gray-900 cursor-pointer w-full"
                  >
                    Threshold
                    <SortIcon column="threshold" />
                  </button>
                </th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">
                  <button
                    onClick={() => handleSort('cushion')}
                    className="flex items-center justify-end gap-1 hover:text-gray-900 cursor-pointer w-full"
                  >
                    % Cushion
                    <SortIcon column="cushion" />
                  </button>
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  <button
                    onClick={() => handleSort('status')}
                    className="flex items-center gap-1 hover:text-gray-900 cursor-pointer"
                  >
                    Status
                    <SortIcon column="status" />
                  </button>
                </th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 text-xs">
                  <button
                    onClick={() => handleSort('days')}
                    className="flex items-center justify-end gap-1 hover:text-gray-900 cursor-pointer w-full"
                  >
                    Days-to-Break
                    <SortIcon column="days" />
                  </button>
                </th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">
                  <button
                    onClick={() => handleSort('esg')}
                    className="flex items-center justify-end gap-1 hover:text-gray-900 cursor-pointer w-full"
                  >
                    ESG Score
                    <SortIcon column="esg" />
                  </button>
                </th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Trend</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((loan, idx) => {
                const statusBadge = getStatusBadge(loan.status);
                return (
                  <tr key={loan.id} className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                    <td className="py-3 px-4 font-medium text-gray-900">{loan.name}</td>
                    <td className="py-3 px-4 text-gray-700">{loan.sector}</td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-900">€{loan.value.toFixed(1)}M</td>
                    <td className="py-3 px-4 text-xs text-gray-600">{loan.covenantType}</td>
                    <td className="py-3 px-4 text-right font-semibold">{loan.currentRatio.toFixed(2)}x</td>
                    <td className="py-3 px-4 text-right text-gray-600">{loan.threshold.toFixed(2)}x</td>
                    <td className={`py-3 px-4 text-right font-semibold ${loan.cushion < 0 ? 'text-red-600' : loan.cushion < 10 ? 'text-amber-600' : 'text-green-600'}`}>
                      {loan.cushion.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={`${statusBadge.color} border`}>
                        {statusBadge.label}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right text-sm">
                      {loan.daysToBreak ? (
                        <span className="font-semibold text-red-600">{loan.daysToBreak}d</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-teal-600">{loan.esgScore}/100</td>
                    <td className="py-3 px-4 text-center text-lg">
                      {loan.trend === 'up' ? (
                        <TrendingUp className="inline w-4 h-4 text-green-600" />
                      ) : (
                        <TrendingDown className="inline w-4 h-4 text-red-600" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile view - Card layout */}
        <div className="md:hidden space-y-3">
          {filteredData.map((loan) => {
            const statusBadge = getStatusBadge(loan.status);
            return (
              <div key={loan.id} className="rounded-lg border border-gray-200 p-3 bg-white space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-sm text-gray-900">{loan.name}</h4>
                    <p className="text-xs text-gray-600">{loan.sector}</p>
                  </div>
                  <Badge className={`${statusBadge.color} border text-xs`}>
                    {statusBadge.label}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded bg-gray-50 p-2">
                    <p className="text-gray-600">Value</p>
                    <p className="font-semibold">€{loan.value.toFixed(1)}M</p>
                  </div>
                  <div className="rounded bg-gray-50 p-2">
                    <p className="text-gray-600">Cushion</p>
                    <p className={`font-semibold ${loan.cushion < 0 ? 'text-red-600' : loan.cushion < 10 ? 'text-amber-600' : 'text-green-600'}`}>
                      {loan.cushion.toFixed(1)}%
                    </p>
                  </div>
                  {loan.daysToBreak && (
                    <div className="rounded bg-gray-50 p-2">
                      <p className="text-gray-600">Days-to-Break</p>
                      <p className="font-semibold text-red-600">{loan.daysToBreak}d</p>
                    </div>
                  )}
                  <div className="rounded bg-gray-50 p-2">
                    <p className="text-gray-600">ESG Score</p>
                    <p className="font-semibold text-teal-600">{loan.esgScore}/100</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {filteredData.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="font-medium">No loans match your filters</p>
            <p className="text-sm">Try adjusting your search or filter criteria</p>
          </div>
        )}

        {/* Export buttons */}
        <div className="flex flex-col md:flex-row gap-2 pt-4 border-t">
          <Button variant="outline" size="sm" onClick={handleCsvExport} className="w-full md:w-auto">
            CSV Export
          </Button>
          <Button className="bg-teal-600 hover:bg-teal-700 w-full md:w-auto" size="sm">
            PDF Export
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
