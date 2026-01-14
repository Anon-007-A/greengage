/**
 * Breach Impact Chart Component
 * Bar chart showing covenant breach impact across loans
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GreenLoan } from '@/types/greenLoan';
import { calculateBreachRisk } from '@/lib/breachCalculator';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { TrendingDown } from 'lucide-react';

interface BreachImpactChartProps {
  loans: GreenLoan[];
  ebitdaDropPercent: number;
  interestRateHikeBps: number;
}

interface ChartDataPoint {
  loanName: string;
  breaches: number;
  atRisk: number;
  safe: number;
  totalCovenants: number;
}

const BreachImpactChart = ({ loans, ebitdaDropPercent, interestRateHikeBps }: BreachImpactChartProps) => {
  const chartData: ChartDataPoint[] = loans.map(loan => {
    if (!loan.covenants || loan.covenants.length === 0) {
      return {
        loanName: loan.companyName.split(' ')[0], // Short name for chart
        breaches: 0,
        atRisk: 0,
        safe: 0,
        totalCovenants: 0
      };
    }

    let breaches = 0;
    let atRisk = 0;
    let safe = 0;

    loan.covenants.forEach(covenant => {
      const breachCalc = calculateBreachRisk(covenant, ebitdaDropPercent, interestRateHikeBps);
      
      if (breachCalc.status === 'breach') {
        breaches++;
      } else if (breachCalc.status === 'warning') {
        atRisk++;
      } else {
        safe++;
      }
    });

    return {
      loanName: loan.companyName.split(' ')[0],
      breaches,
      atRisk,
      safe,
      totalCovenants: loan.covenants.length
    };
  });

  const hasData = chartData.some(d => d.totalCovenants > 0);
  const hasActiveScenario = ebitdaDropPercent > 0 || interestRateHikeBps > 0;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ChartDataPoint;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-sm mb-2">{data.loanName}</p>
          <div className="space-y-1 text-xs">
            <p className="text-red-600 dark:text-red-400">
              Breaches: {data.breaches}
            </p>
            <p className="text-yellow-600 dark:text-yellow-400">
              At Risk: {data.atRisk}
            </p>
            <p className="text-green-600 dark:text-green-400">
              Safe: {data.safe}
            </p>
            <p className="text-muted-foreground pt-1 border-t border-border">
              Total: {data.totalCovenants} covenants
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="font-display text-xl flex items-center gap-2">
          <TrendingDown className="w-5 h-5" />
          Covenant Impact by Loan
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Breakdown of breach and at-risk status across portfolio
        </p>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No covenant data available</p>
          </div>
        ) : !hasActiveScenario ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>Apply stress test parameters to see impact visualization</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="loanName"
                angle={-45}
                textAnchor="end"
                height={80}
                className="text-xs"
                tick={{ fill: 'currentColor' }}
              />
              <YAxis
                label={{ value: 'Covenants', angle: -90, position: 'insideLeft' }}
                className="text-xs"
                tick={{ fill: 'currentColor' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="breaches" stackId="a" fill="#ef4444" name="Breached">
                {chartData.map((entry, index) => (
                  <Cell key={`breach-${index}`} fill="#ef4444" />
                ))}
              </Bar>
              <Bar dataKey="atRisk" stackId="a" fill="#eab308" name="At Risk">
                {chartData.map((entry, index) => (
                  <Cell key={`atrisk-${index}`} fill="#eab308" />
                ))}
              </Bar>
              <Bar dataKey="safe" stackId="a" fill="#22c55e" name="Safe">
                {chartData.map((entry, index) => (
                  <Cell key={`safe-${index}`} fill="#22c55e" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default BreachImpactChart;

