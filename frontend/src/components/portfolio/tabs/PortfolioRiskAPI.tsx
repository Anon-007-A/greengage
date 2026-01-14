/**
 * PortfolioRiskAPI - API-Integrated Risk Dashboard
 * Displays loans with search, filtering, and detailed risk metrics
 */

import { useState } from 'react';
import LoansTableAPI from '../LoansTableAPI';
import LoanDetailModal from '../LoanDetailModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PortfolioRiskAPIProps {
  onNavigate: (tab: string) => void;
}

const PortfolioRiskAPI = ({ onNavigate }: PortfolioRiskAPIProps) => {
  const [selectedLoan, setSelectedLoan] = useState<any | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Portfolio Risk Analysis
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Search, filter, and analyze 100 loans in real-time
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => onNavigate('summary')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Summary
        </Button>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Features</p>
            <ul className="space-y-1 text-sm">
              <li className="text-green-700">✓ Full-text search</li>
              <li className="text-green-700">✓ Multi-filter support</li>
              <li className="text-green-700">✓ Real-time pagination</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Filters Available</p>
            <ul className="space-y-1 text-sm">
              <li className="text-blue-700">• Sector (6 options)</li>
              <li className="text-blue-700">• Risk Level (Low/High/Critical)</li>
              <li className="text-blue-700">• Covenant Status (Compliant/At Risk/Breached)</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Data Source</p>
            <div className="text-sm space-y-1">
              <p className="text-teal-700 font-semibold">Backend API</p>
              <p className="text-gray-600">100 realistic loans</p>
              <p className="text-gray-600">€6.8B portfolio</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Loans Table */}
      <LoansTableAPI onLoanSelect={(loan) => setSelectedLoan(loan)} />

      {/* Loan Detail Modal */}
      <LoanDetailModal open={!!selectedLoan} loan={selectedLoan} onClose={() => setSelectedLoan(null)} />
    </div>
  );
};

export default PortfolioRiskAPI;
