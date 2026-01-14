/**
 * UN SDG Alignment Bar Chart
 * Professional Recharts BarChart showing SDG alignment percentages
 */
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from 'recharts';

interface SDGAlignmentChartProps {
  data?: Array<{ name: string; value: number; fullName: string }>;
}

const SDGAlignmentChart = ({ data }: SDGAlignmentChartProps) => {
  // Default data if not provided
  const chartData = data || [
    { name: 'SDG 7', value: 85, fullName: 'SDG 7 - Affordable & Clean Energy' },
    { name: 'SDG 6', value: 72, fullName: 'SDG 6 - Clean Water & Sanitation' },
    { name: 'SDG 11', value: 68, fullName: 'SDG 11 - Sustainable Cities' },
    { name: 'SDG 13', value: 90, fullName: 'SDG 13 - Climate Action' },
    { name: 'SDG 9', value: 55, fullName: 'SDG 9 - Industry Innovation' },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-sm mb-1">{data.fullName}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Alignment: {data.value}%
          </p>
        </div>
      );
    }
    return null;
  };

  const getBarColor = (value: number) => {
    if (value >= 80) return '#06A77D'; // Teal
    if (value >= 60) return '#66DD00'; // Light Green
    return '#FFAA00'; // Orange
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
        <XAxis
          dataKey="name"
          stroke="#6B7280"
          tick={{ fontSize: 12, fill: '#6B7280' }}
          axisLine={{ stroke: '#E5E7EB' }}
        />
        <YAxis
          stroke="#6B7280"
          tick={{ fontSize: 12, fill: '#6B7280' }}
          domain={[0, 100]}
          axisLine={{ stroke: '#E5E7EB' }}
          label={{ value: 'Alignment %', angle: -90, position: 'insideLeft', style: { fill: '#6B7280' } }}
        />
        <Tooltip 
          content={<CustomTooltip />}
          wrapperStyle={{ backgroundColor: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: '8px' }}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} animationDuration={500}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getBarColor(entry.value)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default SDGAlignmentChart;

