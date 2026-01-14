/**
 * Portfolio Composition Donut Chart
 * Shows Safe/At Risk/Breached distribution
 */
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip } from 'recharts';
import { usePortfolioStatus } from '@/hooks/usePortfolioStatus';
import { GreenLoan } from '@/types/greenLoan';

interface PortfolioCompositionChartProps {
  loans: GreenLoan[];
  ebitdaDropPercent: number;
  interestRateHikeBps: number;
}

const PortfolioCompositionChart = ({ loans, ebitdaDropPercent, interestRateHikeBps }: PortfolioCompositionChartProps) => {
  const portfolioStatus = usePortfolioStatus(loans, ebitdaDropPercent, interestRateHikeBps);

  const data = [
    { name: 'Safe', value: portfolioStatus.safeLoanCount, color: '#28A745' },
    { name: 'At Risk', value: portfolioStatus.atRiskLoanCount, color: '#FF9F43' },
    { name: 'Breached', value: portfolioStatus.breachedLoanCount, color: '#DC3545' },
  ].filter(item => item.value > 0);

  const total = portfolioStatus.totalLoanCount;
  const totalValue = portfolioStatus.totalPortfolioValue;
  const portfolioGreenScore = portfolioStatus.portfolioGreenScore;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0;
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-sm mb-1" style={{ color: data.payload.color }}>
            {data.name}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {data.value} loans ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-center mb-6">
        <div className="relative" style={{ width: 300, height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={90}
                outerRadius={140}
                paddingAngle={2}
                dataKey="value"
                animationDuration={500}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Center Text: show loans and total value */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{total} Loans</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{formatCurrency(totalValue)}</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 mb-4">
        {data.map((item) => {
          const percentage = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0;
          return (
            <div key={item.name} className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {item.name}: {item.value} ({percentage}%)
              </span>
            </div>
          );
        })}
      </div>

      {/* Breakdown row */}
      <div className="flex justify-center gap-6 mb-6">
        <div className="text-sm text-gray-700">Safe: {portfolioStatus.safeLoanCount} ({total>0?Math.round((portfolioStatus.safeLoanCount/total)*100):0}%)</div>
        <div className="text-sm text-gray-700">At Risk: {portfolioStatus.atRiskLoanCount} ({total>0?Math.round((portfolioStatus.atRiskLoanCount/total)*100):0}%)</div>
        <div className="text-sm text-gray-700">Breached: {portfolioStatus.breachedLoanCount} ({total>0?Math.round((portfolioStatus.breachedLoanCount/total)*100):0}%)</div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{total}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Total Loans</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(totalValue)}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Portfolio Value</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold" style={{ color: '#06A77D' }}>{Math.round(portfolioGreenScore)}/100</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">ESG Score</p>
        </div>
      </div>
    </div>
  );
};

export default PortfolioCompositionChart;





