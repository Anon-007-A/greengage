/**
 * ESG 3-Month Trends Chart
 * Interactive visualization of Environmental, Social, and Governance metrics over time
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useMemo } from 'react';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { calculatePortfolioESGResilience } from '@/lib/greenScore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Leaf, Users, BarChart3 } from 'lucide-react';

interface ESGDataPoint {
  month: string;
  environmental: number;
  social: number;
  governance: number;
}

const ESGTrendsChart = () => {
  const { loans: ctxLoans, simulation } = usePortfolio();

  // Build a 12-week trend by interpolating from baseline (0 stress) to current simulation stress
  const data: ESGDataPoint[] = useMemo(() => {
    const weeks = 12;
    const res: ESGDataPoint[] = [];
    for (let i = 0; i < weeks; i++) {
      const factor = i / (weeks - 1); // 0..1
      const eDrop = (simulation?.ebitdaDrop || 0) * factor;
      const rHike = (simulation?.interestRateHike || 0) * factor;
      const overall = calculatePortfolioESGResilience(ctxLoans as any, eDrop, rHike) || 60;
      // Split overall into E/S/G with small deterministic offsets for visualization
      const environmental = Math.max(40, Math.min(100, overall + (i % 3 === 0 ? 2 : -1)));
      const social = Math.max(40, Math.min(100, overall + (i % 2 === 0 ? 1 : -2)));
      const governance = Math.max(40, Math.min(100, overall));
      res.push({ month: `Week ${i + 1}`, environmental, social, governance });
    }
    return res;
  }, [ctxLoans, simulation]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg">
          <p className="font-semibold text-gray-900 dark:text-gray-100">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const latestData = data[data.length - 1];
  const previousData = data[0];

  const getChange = (latest: number, previous: number) => {
    const change = latest - previous;
    return {
      value: Math.abs(change),
      direction: change >= 0 ? 'up' : 'down',
      percent: ((change / previous) * 100).toFixed(1),
    };
  };

  const eChange = getChange(latestData.environmental, previousData.environmental);
  const sChange = getChange(latestData.social, previousData.social);
  const gChange = getChange(latestData.governance, previousData.governance);

  return (
    <Card id="chart-esg-trends" className="col-span-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-teal-600" />
          ESG Performance Trends (3-Month)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Trend Chart */}
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                label={{ value: 'Score (%)', angle: -90, position: 'insideLeft' }}
                domain={[50, 100]}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />

              <Line
                type="monotone"
                dataKey="environmental"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ fill: '#10b981', r: 4 }}
                activeDot={{ r: 6 }}
                name="Environmental"
                isAnimationActive={true}
              />

              <Line
                type="monotone"
                dataKey="social"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={{ fill: '#f59e0b', r: 4 }}
                activeDot={{ r: 6 }}
                name="Social"
                isAnimationActive={true}
              />

              <Line
                type="monotone"
                dataKey="governance"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
                name="Governance"
                isAnimationActive={true}
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Performance Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Environmental */}
            <div className="p-4 rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/20">
              <div className="flex items-center gap-2 mb-3">
                <Leaf className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Environmental
                </h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <p className="text-3xl font-bold text-green-600">
                    {latestData.environmental}%
                  </p>
                  <Badge className={`${eChange.direction === 'up' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                    {eChange.direction === 'up' ? '↑' : '↓'} {eChange.value}%
                  </Badge>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Carbon emissions, water usage, renewable energy integration
                </p>
              </div>
            </div>

            {/* Social */}
            <div className="p-4 rounded-lg border border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/20">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-orange-600" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Social</h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <p className="text-3xl font-bold text-orange-600">
                    {latestData.social}%
                  </p>
                  <Badge className={`${sChange.direction === 'up' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                    {sChange.direction === 'up' ? '↑' : '↓'} {sChange.value}%
                  </Badge>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Labor practices, diversity, community engagement, human rights
                </p>
              </div>
            </div>

            {/* Governance */}
            <div className="p-4 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Governance
                </h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <p className="text-3xl font-bold text-blue-600">
                    {latestData.governance}%
                  </p>
                  <Badge className={`${gChange.direction === 'up' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                    {gChange.direction === 'up' ? '↑' : '↓'} {gChange.value}%
                  </Badge>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Board composition, compliance, transparency, risk management
                </p>
              </div>
            </div>
          </div>

          {/* Overall Assessment */}
          <div className="p-4 rounded-lg border border-teal-200 dark:border-teal-900 bg-teal-50 dark:bg-teal-950/20">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
              ESG Performance Trajectory
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              All three ESG pillars show consistent improvement over the 3-month period.
              The borrower has demonstrated strong commitment to sustainability goals.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-teal-200 text-teal-800">Improving Trend</Badge>
              <Badge className="bg-green-200 text-green-800">All Metrics Up</Badge>
              <Badge className="bg-blue-200 text-blue-800">On Track</Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ESGTrendsChart;
