/**
 * Stress Test Tab
 * Preset scenarios, sliders, real-time updates, loan portfolio table
 */
import { useState, useMemo } from 'react';
import { useGreenGaugeStore } from '@/store/useGreenGaugeStore';
import { usePortfolioStatus } from '@/hooks/usePortfolioStatus';
import { useGlobalData } from '@/context/GlobalDataContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, Play, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import BreachTimelineChart from '../charts/BreachTimelineChart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface StressTestProps {
  onNavigate: (tab: string) => void;
}

const StressTest = ({ onNavigate }: StressTestProps) => {
  const { ebitdaDropPercent, interestRateHikeBps, setStressTestParams } = useGreenGaugeStore();
  const { allLoans } = useGlobalData();
  const [localEbitda, setLocalEbitda] = useState(ebitdaDropPercent);
  const [localRateHike, setLocalRateHike] = useState(interestRateHikeBps);
  const [sortField, setSortField] = useState<'status' | 'sector' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterStatus, setFilterStatus] = useState<'all' | 'BREACHED' | 'AT_RISK' | 'SAFE'>('all');
  const [filterSector, setFilterSector] = useState<string>('all');

  const portfolioStatus = usePortfolioStatus(allLoans as any, localEbitda, localRateHike);

  // Preset scenarios
  const presets = [
    { name: 'Mild Downturn', ebitda: 10, rateHike: 50 },
    { name: 'Rate Shock', ebitda: 5, rateHike: 200 },
    { name: 'Recession', ebitda: 30, rateHike: 150 },
    { name: 'Reset', ebitda: 0, rateHike: 0 },
  ];

  const handlePreset = (ebitda: number, rateHike: number) => {
    setLocalEbitda(ebitda);
    setLocalRateHike(rateHike);
  };

  const handleRunStressTest = () => {
    setStressTestParams(localEbitda, localRateHike);
  };

  // Filter and sort loans
  const filteredAndSortedLoans = useMemo(() => {
    let filtered = portfolioStatus.loans;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(ls => ls.status === filterStatus);
    }

    if (filterSector !== 'all') {
      filtered = filtered.filter(ls => ls.loan.sector === filterSector);
    }

    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aVal: any, bVal: any;
        if (sortField === 'status') {
          aVal = a.status;
          bVal = b.status;
        } else if (sortField === 'sector') {
          aVal = a.loan.sector;
          bVal = b.loan.sector;
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [portfolioStatus.loans, filterStatus, filterSector, sortField, sortDirection]);

  const sectors = Array.from(new Set(allLoans.map(l => l.sector)));

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'BREACHED':
        return <Badge variant="destructive">Breached</Badge>;
      case 'AT_RISK':
        return <Badge variant="outline" className="border-orange-500 text-orange-700 dark:text-orange-400">At Risk</Badge>;
      default:
        return <Badge variant="outline" className="border-green-500 text-green-700 dark:text-green-400">Safe</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <button
        onClick={() => onNavigate('summary')}
        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Summary
      </button>

      {/* Preset Scenario Buttons */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Preset Scenarios
        </h2>
        <div className="flex flex-wrap gap-3">
          {presets.map((preset) => (
            <Button
              key={preset.name}
              variant="outline"
              onClick={() => handlePreset(preset.ebitda, preset.rateHike)}
              className={cn(
                'transition-all duration-200',
                localEbitda === preset.ebitda && localRateHike === preset.rateHike
                  ? 'bg-teal-50 dark:bg-teal-950/20 border-teal-600 text-teal-700 dark:text-teal-400'
                  : ''
              )}
            >
              {preset.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-gray-200 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">EBITDA Drop</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Slider
              value={[localEbitda]}
              onValueChange={(value) => setLocalEbitda(value[0])}
              max={100}
              min={0}
              step={1}
              className="w-full"
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">0%</span>
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{localEbitda}%</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">100%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Interest Rate Hike</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Slider
              value={[localRateHike]}
              onValueChange={(value) => setLocalRateHike(value[0])}
              max={500}
              min={0}
              step={5}
              className="w-full"
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">0 bps</span>
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{localRateHike} bps</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">500 bps</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Run Stress Test Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleRunStressTest}
          className="bg-teal-600 hover:bg-teal-700 text-white h-12 px-8 text-base font-medium"
        >
          <Play className="w-4 h-4 mr-2" />
          Run Stress Test
        </Button>
      </div>

      {/* Scenario Impact */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Scenario Impact
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className={cn(
            'border-2',
            portfolioStatus.breachedLoanCount > 0
              ? 'bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-900'
              : 'border-gray-200 dark:border-gray-800'
          )}>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Loans Breached</p>
              <p className={cn(
                'text-4xl font-bold',
                portfolioStatus.breachedLoanCount > 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-900 dark:text-gray-100'
              )}>
                {portfolioStatus.breachedLoanCount}
              </p>
            </CardContent>
          </Card>

          <Card className={cn(
            'border-2',
            portfolioStatus.atRiskLoanCount > 0
              ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-300 dark:border-orange-900'
              : 'border-gray-200 dark:border-gray-800'
          )}>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">At Risk</p>
              <p className={cn(
                'text-4xl font-bold',
                portfolioStatus.atRiskLoanCount > 0
                  ? 'text-orange-600 dark:text-orange-400'
                  : 'text-gray-900 dark:text-gray-100'
              )}>
                {portfolioStatus.atRiskLoanCount}
              </p>
            </CardContent>
          </Card>
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
              loans={allLoans as any}
              ebitdaDropPercent={localEbitda}
              interestRateHikeBps={localRateHike}
            />
          </CardContent>
        </Card>
      </div>

      {/* Loan Portfolio Table - Sortable/Filterable */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Loan Portfolio
        </h2>

        {/* Filters */}
        <div className="flex gap-4 mb-4">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm"
          >
            <option value="all">All Status</option>
            <option value="BREACHED">Breached</option>
            <option value="AT_RISK">At Risk</option>
            <option value="SAFE">Safe</option>
          </select>

          <select
            value={filterSector}
            onChange={(e) => setFilterSector(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm"
          >
            <option value="all">All Sectors</option>
            {sectors.map(sector => (
              <option key={sector} value={sector}>{sector}</option>
            ))}
          </select>
        </div>

        <Card className="border-gray-200 dark:border-gray-800">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => {
                        if (sortField === 'status') {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField('status');
                          setSortDirection('asc');
                        }
                      }}
                    >
                      Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => {
                        if (sortField === 'sector') {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField('sector');
                          setSortDirection('asc');
                        }
                      }}
                    >
                      Sector {sortField === 'sector' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead>Breaches</TableHead>
                    <TableHead>At Risk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedLoans.map((loanStatus) => (
                    <TableRow key={loanStatus.loan.id}>
                      <TableCell>{getStatusBadge(loanStatus.status)}</TableCell>
                      <TableCell className="font-medium">{loanStatus.loan.companyName}</TableCell>
                      <TableCell>{formatCurrency(loanStatus.loan.loanAmount)}</TableCell>
                      <TableCell>{loanStatus.loan.sector}</TableCell>
                      <TableCell>{loanStatus.breachCount}</TableCell>
                      <TableCell>{loanStatus.atRiskCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StressTest;

