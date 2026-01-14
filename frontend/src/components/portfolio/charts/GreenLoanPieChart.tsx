/**
 * Green Loan Classification Pie Chart
 * Professional Recharts PieChart with Dark Green, Light Green, Transition
 */
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { usePortfolioStatus } from '@/hooks/usePortfolioStatus';
import { GreenLoan } from '@/types/greenLoan';
import { calculateStressedGreenScore, getESGCategory } from '@/lib/greenScore';

interface GreenLoanPieChartProps {
  loans: GreenLoan[];
  ebitdaDropPercent: number;
  interestRateHikeBps: number;
}

const GreenLoanPieChart = ({ loans, ebitdaDropPercent, interestRateHikeBps }: GreenLoanPieChartProps) => {
  const portfolioStatus = usePortfolioStatus(loans, ebitdaDropPercent, interestRateHikeBps);

  const darkGreen = portfolioStatus.darkGreenLoanCount;
  const lightGreen = portfolioStatus.lightGreenLoanCount;
  const transition = portfolioStatus.transitionLoanCount;

  const data = [
    { name: 'Dark Green', value: darkGreen, color: '#00AA44' },
    { name: 'Light Green', value: lightGreen, color: '#66DD00' },
    { name: 'Transition', value: transition, color: '#FFAA00' },
  ];

  const total = darkGreen + lightGreen + transition;

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

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, value }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null; // Don't show label if slice is too small

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs font-semibold"
      >
        {`${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={CustomLabel}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
          animationDuration={500}
          style={{ filter: 'none' }} // No 3D effects
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
          ))}
        </Pie>
        <Tooltip 
          content={<CustomTooltip />}
          wrapperStyle={{ backgroundColor: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: '8px' }}
        />
        <Legend
          verticalAlign="bottom"
          height={36}
          formatter={(value, entry: any) => {
            const entryData = data.find(d => d.name === value);
            const percentage = total > 0 ? ((entryData?.value || 0) / total * 100).toFixed(0) : 0;
            return (
              <span style={{ color: entry.color, fontSize: '12px' }}>
                {value}: {entryData?.value || 0} ({percentage}%)
              </span>
            );
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default GreenLoanPieChart;

