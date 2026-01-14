/**
 * Interactive Covenant Breakdown Pie Chart with Drill-down
 * Hierarchical view of covenant types and their status distribution
 */

import { useState } from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp } from 'lucide-react';

interface CovenantData {
  name: string;
  value: number;
  color: string;
  compliant?: number;
  breached?: number;
  atRisk?: number;
}

interface CovenantBreakdown {
  [key: string]: CovenantData[];
}

const CovenantBreakdownChart = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Top-level covenant categories
  const topLevelData: CovenantData[] = [
    { name: 'Financial', value: 45, color: '#3b82f6' },
    { name: 'ESG-Based', value: 30, color: '#10b981' },
    { name: 'Operational', value: 15, color: '#f59e0b' },
    { name: 'Sustainability', value: 10, color: '#8b5cf6' },
  ];

  // Detailed breakdown by type
  const covenantBreakdown: CovenantBreakdown = {
    Financial: [
      { name: 'Compliant', value: 38, color: '#10b981', compliant: 38, breached: 0, atRisk: 0 },
      { name: 'At Risk', value: 5, color: '#f59e0b', compliant: 0, breached: 0, atRisk: 5 },
      { name: 'Breached', value: 2, color: '#ef4444', compliant: 0, breached: 2, atRisk: 0 },
    ],
    'ESG-Based': [
      { name: 'Compliant', value: 24, color: '#10b981', compliant: 24, breached: 0, atRisk: 0 },
      { name: 'At Risk', value: 4, color: '#f59e0b', compliant: 0, breached: 0, atRisk: 4 },
      { name: 'Breached', value: 2, color: '#ef4444', compliant: 0, breached: 2, atRisk: 0 },
    ],
    Operational: [
      { name: 'Compliant', value: 13, color: '#10b981', compliant: 13, breached: 0, atRisk: 0 },
      { name: 'At Risk', value: 2, color: '#f59e0b', compliant: 0, breached: 0, atRisk: 2 },
      { name: 'Breached', value: 0, color: '#ef4444', compliant: 0, breached: 0, atRisk: 0 },
    ],
    Sustainability: [
      { name: 'Compliant', value: 8, color: '#10b981', compliant: 8, breached: 0, atRisk: 0 },
      { name: 'At Risk', value: 2, color: '#f59e0b', compliant: 0, breached: 0, atRisk: 2 },
      { name: 'Breached', value: 0, color: '#ef4444', compliant: 0, breached: 0, atRisk: 0 },
    ],
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg">
          <p className="font-semibold text-gray-900 dark:text-gray-100">{data.name}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Count: {data.value}</p>
          {selectedCategory && (
            <>
              {data.compliant > 0 && (
                <p className="text-xs text-green-600">✓ Compliant: {data.compliant}</p>
              )}
              {data.atRisk > 0 && (
                <p className="text-xs text-orange-600">⚠ At Risk: {data.atRisk}</p>
              )}
              {data.breached > 0 && (
                <p className="text-xs text-red-600">✗ Breached: {data.breached}</p>
              )}
            </>
          )}
        </div>
      );
    }
    return null;
  };

  const currentData = selectedCategory ? covenantBreakdown[selectedCategory] : topLevelData;

  const totalCovenants = topLevelData.reduce((sum, item) => sum + item.value, 0);
  const selectedCovenants = selectedCategory
    ? covenantBreakdown[selectedCategory].reduce((sum, item) => sum + item.value, 0)
    : totalCovenants;

  const compliantCount = selectedCategory
    ? covenantBreakdown[selectedCategory].reduce(
        (sum, item) => sum + (item.compliant || 0),
        0
      )
    : topLevelData.reduce((sum, item) => sum + item.value, 0) * 0.88; // Approximate

  const complianceRate = ((compliantCount / selectedCovenants) * 100).toFixed(1);

  return (
    <Card id="chart-covenant-breakdown" className="col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <CardTitle>
              {selectedCategory
                ? `${selectedCategory} Covenant Breakdown`
                : 'Covenant Type Distribution'}
            </CardTitle>
          </div>
          {selectedCategory && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedCategory(null)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Pie Chart */}
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={currentData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                onClick={(entry: any) => {
                  if (!selectedCategory) {
                    setSelectedCategory(entry.name);
                  }
                }}
              >
                {currentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>

          {/* Compliance Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Count</p>
              <p className="text-3xl font-bold text-blue-600">{selectedCovenants}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                {selectedCategory ? `${selectedCategory} covenants` : 'across all types'}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Compliance Rate</p>
              <p className="text-3xl font-bold text-green-600">{complianceRate}%</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                {selectedCategory ? `${selectedCategory} compliant` : 'portfolio-wide'}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Risk Level</p>
              <p className="text-3xl font-bold text-orange-600">
                {selectedCategory ? (
                  covenantBreakdown[selectedCategory][2]?.value || 0
                ) : (
                  topLevelData.length * 2
                )}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                {selectedCategory ? 'breached' : 'total at-risk items'}
              </p>
            </div>
          </div>

          {/* Category Legend (if not selected) */}
          {!selectedCategory && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
              {topLevelData.map((item, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedCategory(item.name)}
                  className="p-3 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                      {item.name}
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {item.value}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {((item.value / totalCovenants) * 100).toFixed(0)}%
                  </p>
                </button>
              ))}
            </div>
          )}

          {/* Detailed View (if selected) */}
          {selectedCategory && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Status Distribution
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {covenantBreakdown[selectedCategory].map((item, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: `${item.color}20` }}
                  >
                    <p className="text-sm font-medium mb-1" style={{ color: item.color }}>
                      {item.name}
                    </p>
                    <p className="text-2xl font-bold" style={{ color: item.color }}>
                      {item.value}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {((item.value / selectedCovenants) * 100).toFixed(0)}% of {selectedCategory}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CovenantBreakdownChart;
