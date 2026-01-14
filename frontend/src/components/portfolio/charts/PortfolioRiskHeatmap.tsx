/**
 * Portfolio Risk Heat Matrix
 * Interactive heatmap showing covenant breach risk across portfolio
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

interface PortfolioRisk {
  company: string;
  sector: string;
  exposure: number;
  breachRisk: number;
  covenantStatus: 'compliant' | 'at-risk' | 'breached';
  riskTrend: 'improving' | 'stable' | 'deteriorating';
}

const PortfolioRiskHeatmap = () => {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  const portfolioData: PortfolioRisk[] = [
    { company: 'GreenEnergy Corp', sector: 'Renewable Energy', exposure: 250, breachRisk: 15, covenantStatus: 'compliant', riskTrend: 'improving' },
    { company: 'ClimateFinance GmbH', sector: 'Green Finance', exposure: 180, breachRisk: 28, covenantStatus: 'at-risk', riskTrend: 'deteriorating' },
    { company: 'SolarTech Ltd', sector: 'Solar Energy', exposure: 200, breachRisk: 42, covenantStatus: 'at-risk', riskTrend: 'deteriorating' },
    { company: 'WindPower SA', sector: 'Wind Energy', exposure: 320, breachRisk: 8, covenantStatus: 'compliant', riskTrend: 'improving' },
    { company: 'EcoForest BV', sector: 'Forestry', exposure: 150, breachRisk: 65, covenantStatus: 'breached', riskTrend: 'deteriorating' },
    { company: 'BioDiesel AG', sector: 'Biofuels', exposure: 210, breachRisk: 35, covenantStatus: 'at-risk', riskTrend: 'stable' },
    { company: 'ElectricMobility NV', sector: 'EV Charging', exposure: 280, breachRisk: 12, covenantStatus: 'compliant', riskTrend: 'improving' },
    { company: 'GreenBuildings SA', sector: 'Real Estate', exposure: 190, breachRisk: 48, covenantStatus: 'at-risk', riskTrend: 'stable' },
    { company: 'Water Systems Ltd', sector: 'Water', exposure: 160, breachRisk: 22, covenantStatus: 'compliant', riskTrend: 'improving' },
    { company: 'Carbon Capture Inc', sector: 'Climate Tech', exposure: 140, breachRisk: 72, covenantStatus: 'breached', riskTrend: 'deteriorating' },
    { company: 'Smart Grid Solutions', sector: 'Energy Tech', exposure: 220, breachRisk: 31, covenantStatus: 'at-risk', riskTrend: 'stable' },
    { company: 'Sustainable Transport', sector: 'Transport', exposure: 250, breachRisk: 18, covenantStatus: 'compliant', riskTrend: 'improving' },
  ];

  const getRiskColor = (risk: number): string => {
    if (risk < 20) return 'bg-green-100 dark:bg-green-950 hover:bg-green-200 dark:hover:bg-green-900';
    if (risk < 40) return 'bg-yellow-100 dark:bg-yellow-950 hover:bg-yellow-200 dark:hover:bg-yellow-900';
    if (risk < 60) return 'bg-orange-100 dark:bg-orange-950 hover:bg-orange-200 dark:hover:bg-orange-900';
    return 'bg-red-100 dark:bg-red-950 hover:bg-red-200 dark:hover:bg-red-900';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'at-risk':
        return <Clock className="w-4 h-4 text-orange-600" />;
      case 'breached':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getTrendArrow = (trend: string) => {
    switch (trend) {
      case 'improving':
        return '↓';
      case 'stable':
        return '→';
      case 'deteriorating':
        return '↑';
      default:
        return '→';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving':
        return 'text-green-600';
      case 'stable':
        return 'text-gray-600';
      case 'deteriorating':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const riskStats = {
    compliant: portfolioData.filter(p => p.covenantStatus === 'compliant').length,
    atRisk: portfolioData.filter(p => p.covenantStatus === 'at-risk').length,
    breached: portfolioData.filter(p => p.covenantStatus === 'breached').length,
    avgRisk: (portfolioData.reduce((sum, p) => sum + p.breachRisk, 0) / portfolioData.length).toFixed(1),
  };

  const highestRisk = portfolioData.reduce((prev, current) =>
    prev.breachRisk > current.breachRisk ? prev : current
  );

  return (
    <Card id="chart-risk-heatmap" className="col-span-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          Portfolio Risk Heat Matrix
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Covenant breach risk assessment across all loans
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Risk Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
              <p className="text-sm text-gray-600 dark:text-gray-400">Compliant</p>
              <p className="text-2xl font-bold text-green-600">{riskStats.compliant}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">loans</p>
            </div>

            <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900">
              <p className="text-sm text-gray-600 dark:text-gray-400">At Risk</p>
              <p className="text-2xl font-bold text-orange-600">{riskStats.atRisk}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">loans</p>
            </div>

            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
              <p className="text-sm text-gray-600 dark:text-gray-400">Breached</p>
              <p className="text-2xl font-bold text-red-600">{riskStats.breached}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">loans</p>
            </div>

            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Risk</p>
              <p className="text-2xl font-bold text-blue-600">{riskStats.avgRisk}%</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">portfolio</p>
            </div>
          </div>

          {/* Risk Heatmap Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Company
                  </th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Sector
                  </th>
                  <th className="text-center py-2 px-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Exposure (€M)
                  </th>
                  <th className="text-center py-2 px-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Breach Risk
                  </th>
                  <th className="text-center py-2 px-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Status
                  </th>
                  <th className="text-center py-2 px-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Trend
                  </th>
                </tr>
              </thead>
              <tbody>
                {portfolioData.map((row, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                    onMouseEnter={() => setHoveredCell(`${row.company}-${index}`)}
                    onMouseLeave={() => setHoveredCell(null)}
                  >
                    <td className="py-3 px-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {row.company}
                    </td>
                    <td className="py-3 px-3 text-sm text-gray-600 dark:text-gray-400">
                      {row.sector}
                    </td>
                    <td className="py-3 px-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100">
                      €{row.exposure}M
                    </td>
                    <td className="py-3 px-3">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={`flex items-center justify-center px-3 py-2 rounded-lg font-bold text-sm cursor-pointer transition-colors ${getRiskColor(
                                row.breachRisk
                              )}`}
                            >
                              {row.breachRisk}%
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              {row.breachRisk < 20
                                ? 'Low risk - Strong performance'
                                : row.breachRisk < 40
                                ? 'Moderate risk - Monitor closely'
                                : row.breachRisk < 60
                                ? 'High risk - Intervention needed'
                                : 'Critical risk - Immediate action required'}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {getStatusIcon(row.covenantStatus)}
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {row.covenantStatus.charAt(0).toUpperCase() + row.covenantStatus.slice(1)}
                        </span>
                      </div>
                    </td>
                    <td className={`py-3 px-3 text-center font-bold text-lg ${getTrendColor(row.riskTrend)}`}>
                      {getTrendArrow(row.riskTrend)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Highest Risk Alert */}
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 dark:text-red-100">
                  Highest Risk Loan
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  {highestRisk.company} ({highestRisk.sector}) has the highest breach risk
                  at {highestRisk.breachRisk}%. Immediate review and intervention recommended.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PortfolioRiskHeatmap;
