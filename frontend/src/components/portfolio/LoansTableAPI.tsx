/**
 * LoansTableAPI - Searchable & Filterable Loans Table
 * Displays all 100 loans from the real API with search, filtering, and pagination
 */

import { useState, useMemo } from 'react';
import { GreenLoan } from '@/types/greenLoan';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  TrendingDown,
  CheckCircle,
} from 'lucide-react';
import { useGreenGaugeStore } from '@/store/useGreenGaugeStore';
import { usePortfolioStatus } from '@/hooks/usePortfolioStatus';
import { usePortfolio } from '@/contexts/PortfolioContext';

interface LoansTableAPIProps {
  onLoanSelect?: (loan: GreenLoan) => void;
}

const LoansTableAPI = ({ onLoanSelect }: LoansTableAPIProps) => {
  const { loans } = usePortfolio();
  const loading = loans.length === 0;
  const error = null;
  const [searchQuery, setSearchQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;

  // Extract unique sectors from loans
  const sectors = useMemo(() => {
    const uniqueSectors = new Set(loans.map(l => l.sector));
    return Array.from(uniqueSectors).sort();
  }, [loans]);

  // Use computed portfolio statuses so filters reflect current scenario
  const { simulation } = usePortfolio();
  const ebitdaDropPercent = simulation?.ebitdaDrop || 0;
  const interestRateHikeBps = simulation?.interestRateHike || 0;
  const portfolioStatus = usePortfolioStatus(loans as any, ebitdaDropPercent, interestRateHikeBps);
  const loanStatusMap = useMemo(() => new Map(portfolioStatus.loans.map((ls: any) => [ls.loan.id, ls.status])), [portfolioStatus.loans]);

  // Filter loans based on all criteria
  const filteredLoans = useMemo(() => {
    return loans.filter((loan: any) => {
      const company = (loan.company || loan.name || '').toString();
      const matchesSearch = company.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSector = sectorFilter === 'all' || loan.sector === sectorFilter;
      const rs = loan.riskScore || 0;
      const riskLevel = rs > 70 ? 'critical' : rs > 40 ? 'high' : 'low';
      const matchesRisk = riskFilter === 'all' || riskLevel === riskFilter;
      const computed = (loanStatusMap.get(loan.id) || 'SAFE').toString();
      const statusNorm = computed === 'BREACHED' ? 'BREACHED' : computed === 'AT_RISK' ? 'AT_RISK' : 'COMPLIANT';
      const matchesStatus = statusFilter === 'all' || statusNorm === statusFilter;
      return matchesSearch && matchesSector && matchesRisk && matchesStatus;
    });
  }, [loans, searchQuery, sectorFilter, riskFilter, statusFilter, loanStatusMap]);

  // Pagination
  const totalPages = Math.ceil(filteredLoans.length / itemsPerPage);
  const paginatedLoans = filteredLoans.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLIANT':
        return (
          <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Compliant
          </Badge>
        );
      case 'AT_RISK':
        return (
          <Badge className="bg-orange-100 text-orange-800 flex items-center gap-1">
            <TrendingDown className="w-3 h-3" /> At Risk
          </Badge>
        );
      case 'BREACHED':
        return (
          <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Breached
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRiskBadge = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low':
        return <Badge variant="outline" className="bg-green-50">Low</Badge>;
      case 'high':
        return <Badge variant="outline" className="bg-orange-50">High</Badge>;
      case 'critical':
        return <Badge variant="outline" className="bg-red-50">Critical</Badge>;
      default:
        return <Badge variant="outline">{riskLevel}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  };

  if (loading) {
    return <div className="text-center py-8">Loading loans...</div>;
  }

  if (error) {
    return (
      <Card className="border-red-300">
        <CardContent className="p-6">
          <p className="text-red-600">Error loading loans: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-gray-200 dark:border-gray-800">
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <CardTitle className="text-xl">Loans Database ({filteredLoans.length} total)</CardTitle>
          <div className="text-sm text-gray-600">Page {currentPage + 1} of {totalPages || 1}</div>
        </div>

        {/* Search & Filters */}
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by company name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(0);
              }}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Sector Filter */}
            <Select value={sectorFilter} onValueChange={(value) => {
              setSectorFilter(value);
              setCurrentPage(0);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by sector" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sectors</SelectItem>
                {sectors.map(sector => (
                  <SelectItem key={sector} value={sector}>
                    {sector}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Risk Filter */}
            <Select value={riskFilter} onValueChange={(value) => {
              setRiskFilter(value);
              setCurrentPage(0);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by risk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk Levels</SelectItem>
                <SelectItem value="low">Low Risk</SelectItem>
                <SelectItem value="high">High Risk</SelectItem>
                <SelectItem value="critical">Critical Risk</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(value) => {
              setStatusFilter(value);
              setCurrentPage(0);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="COMPLIANT">Compliant</SelectItem>
                <SelectItem value="AT_RISK">At Risk</SelectItem>
                <SelectItem value="BREACHED">Breached</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Risk Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLoans.length > 0 ? (
                paginatedLoans.map(loan => (
                  <TableRow
                    key={loan.id || 'unknown'}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900"
                    onClick={() => onLoanSelect?.(loan)}
                  >
                    <TableCell className="font-medium">{loan.companyName || loan.company || loan.name || 'Unknown'}</TableCell>
                    <TableCell className="text-sm text-gray-600">{loan.sector || 'Unknown'}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(loan.loanAmount || loan.amount || 0)}
                    </TableCell>
                    <TableCell>{getRiskBadge(loan.riskScore?.level || 'low')}</TableCell>
                    <TableCell>{getStatusBadge(loan.status)}</TableCell>
                    <TableCell className="text-right">
                      <span className={`font-semibold ${
                        (loan.riskScore?.overall || 0) >= 70 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {Math.round(loan.riskScore?.overall || 0)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No loans match your filters
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {currentPage * itemsPerPage + 1}-{Math.min((currentPage + 1) * itemsPerPage, filteredLoans.length)} of {filteredLoans.length} loans
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-sm font-medium">
                {currentPage + 1} / {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                disabled={currentPage >= totalPages - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LoansTableAPI;
