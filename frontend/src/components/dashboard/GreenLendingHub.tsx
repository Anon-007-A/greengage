/**
 * Green Financing Intelligence Hub
 * Comprehensive ESG and green lending analytics dashboard
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePortfolioStatus } from '@/hooks/usePortfolioStatus';
import { calculatePortfolioGreenScore, getESGCategory } from '@/lib/greenScore';
import { GreenLoan } from '@/types/greenLoan';
import { 
  Leaf, Zap, Droplets, Recycle, Users, Building2, 
  TrendingUp, Award, Target, Globe, FileCheck
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { cn } from '@/lib/utils';

interface GreenLendingHubProps {
  loans: GreenLoan[];
  ebitdaDropPercent: number;
  interestRateHikeBps: number;
}

const GreenLendingHub = ({ loans, ebitdaDropPercent, interestRateHikeBps }: GreenLendingHubProps) => {
  const portfolioStatus = usePortfolioStatus(loans, ebitdaDropPercent, interestRateHikeBps);
  const portfolioGreenScore = calculatePortfolioGreenScore(loans, ebitdaDropPercent, interestRateHikeBps);

  // Calculate comprehensive ESG metrics
  const esgMetrics = {
    totalCO2Reduced: loans.reduce((sum, loan) => {
      const co2Metric = loan.esgMetrics?.find(m => 
        m.name.toLowerCase().includes('co2') || m.name.toLowerCase().includes('carbon')
      );
      return sum + (co2Metric?.currentValue || 0);
    }, 0),
    
    totalRenewableEnergy: loans.reduce((sum, loan) => {
      const energyMetric = loan.esgMetrics?.find(m => 
        m.name.toLowerCase().includes('energy') && m.unit.includes('Wh')
      );
      return sum + (energyMetric?.currentValue || 0);
    }, 0),
    
    totalWaterConserved: loans.reduce((sum, loan) => {
      const waterMetric = loan.esgMetrics?.find(m => 
        m.name.toLowerCase().includes('water')
      );
      return sum + (waterMetric?.currentValue || 0);
    }, 0),
    
    totalWasteReduced: loans.reduce((sum, loan) => {
      const wasteMetric = loan.esgMetrics?.find(m => 
        m.name.toLowerCase().includes('waste')
      );
      return sum + (wasteMetric?.currentValue || 0);
    }, 0),
  };

  // Calculate green loan classification
  const greenLoanCounts = {
    darkGreen: portfolioStatus.darkGreenLoanCount,
    lightGreen: portfolioStatus.lightGreenLoanCount,
    transition: portfolioStatus.transitionLoanCount,
  };

  const totalGreenLoans = greenLoanCounts.darkGreen + greenLoanCounts.lightGreen;
  const greenLoanPercentage = (totalGreenLoans / loans.length) * 100;

  // Calculate renewable energy capacity (estimate from energy generated)
  const renewableCapacityMW = esgMetrics.totalRenewableEnergy * 0.5; // Rough estimate: 0.5 MW per GWh

  // SDG Alignment (mock data for demo)
  const sdgAlignment = {
    'SDG 7 - Affordable & Clean Energy': 85,
    'SDG 6 - Clean Water & Sanitation': 72,
    'SDG 11 - Sustainable Cities': 68,
    'SDG 13 - Climate Action': 90,
    'SDG 9 - Industry Innovation': 55,
  };

  // EU Taxonomy alignment
  const euTaxonomyAligned = loans.filter(loan => {
    const greenScore = calculatePortfolioGreenScore([loan], ebitdaDropPercent, interestRateHikeBps);
    return greenScore >= 50; // Light Green or better
  }).length;
  const euTaxonomyPercentage = (euTaxonomyAligned / loans.length) * 100;

  // Green bond eligibility
  const greenBondEligible = loans
    .filter(loan => {
      const greenScore = calculatePortfolioGreenScore([loan], ebitdaDropPercent, interestRateHikeBps);
      return greenScore >= 80; // Dark Green only
    })
    .reduce((sum, loan) => sum + loan.loanAmount, 0);

  // Chart data
  const greenLoanChartData = [
    { name: 'Dark Green', value: greenLoanCounts.darkGreen, color: '#22c55e' },
    { name: 'Light Green', value: greenLoanCounts.lightGreen, color: '#eab308' },
    { name: 'Transition', value: greenLoanCounts.transition, color: '#f97316' },
  ];

  const sdgChartData = Object.entries(sdgAlignment).map(([name, value]) => ({
    name: name.replace('SDG ', '').split(' - ')[0],
    value,
    fullName: name
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <Leaf className="w-6 h-6 text-green-600" />
          Green Financing Intelligence
        </h2>
        <p className="text-muted-foreground mt-1">
          Comprehensive ESG analytics, green loan classification, and regulatory compliance metrics
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-950/20 flex items-center justify-center">
                <Leaf className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Portfolio Green Score</p>
                <p className="text-xl font-bold">{portfolioGreenScore}/100</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Clean Energy</p>
                <p className="text-xl font-bold">{esgMetrics.totalRenewableEnergy.toFixed(0)} GWh</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/20 flex items-center justify-center">
                <Recycle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">CO₂ Reduced</p>
                <p className="text-xl font-bold">{(esgMetrics.totalCO2Reduced / 1000).toFixed(0)}K t</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-950/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Green Loans</p>
                <p className="text-xl font-bold">{greenLoanPercentage.toFixed(0)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Green Loan Classification */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Green Loan Classification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={greenLoanChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {greenLoanChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>

            <div className="space-y-2 pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Dark Green (≥80)</span>
                <Badge variant="outline" className="bg-green-100 dark:bg-green-950/20 border-green-300">
                  {greenLoanCounts.darkGreen} loans
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Light Green (50-79)</span>
                <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-950/20 border-yellow-300">
                  {greenLoanCounts.lightGreen} loans
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Transition (&lt;50)</span>
                <Badge variant="outline" className="bg-orange-100 dark:bg-orange-950/20 border-orange-300">
                  {greenLoanCounts.transition} loans
                </Badge>
              </div>
            </div>

            {greenLoanPercentage < 60 && (
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
                <p className="text-xs text-blue-900 dark:text-blue-100">
                  <strong>Recommendation:</strong> Increase green loans from {greenLoanPercentage.toFixed(0)}% to 60%+ to unlock green bond funding opportunities.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SDG Alignment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              UN SDG Alignment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={sdgChartData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number) => `${value}%`}
                  labelFormatter={(label) => sdgChartData.find(d => d.name === label)?.fullName || label}
                />
                <Bar dataKey="value" fill="#22c55e" radius={[4, 4, 0, 0]}>
                  {sdgChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.value >= 80 ? '#22c55e' : entry.value >= 60 ? '#eab308' : '#f97316'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Environmental Impact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Leaf className="w-5 h-5" />
              Environmental Impact Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-green-600" />
                  <p className="text-xs text-muted-foreground">Renewable Capacity</p>
                </div>
                <p className="text-lg font-bold">{renewableCapacityMW.toFixed(0)} MW</p>
              </div>

              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
                <div className="flex items-center gap-2 mb-1">
                  <Recycle className="w-4 h-4 text-emerald-600" />
                  <p className="text-xs text-muted-foreground">CO₂ Prevented</p>
                </div>
                <p className="text-lg font-bold">{(esgMetrics.totalCO2Reduced / 1000).toFixed(0)}K t</p>
              </div>

              {esgMetrics.totalWaterConserved > 0 && (
                <div className="p-3 rounded-lg bg-cyan-50 dark:bg-cyan-950/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Droplets className="w-4 h-4 text-cyan-600" />
                    <p className="text-xs text-muted-foreground">Water Conserved</p>
                  </div>
                  <p className="text-lg font-bold">{(esgMetrics.totalWaterConserved / 1000).toFixed(0)}K m³</p>
                </div>
              )}

              {esgMetrics.totalWasteReduced > 0 && (
                <div className="p-3 rounded-lg bg-teal-50 dark:bg-teal-950/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Recycle className="w-4 h-4 text-teal-600" />
                    <p className="text-xs text-muted-foreground">Waste Reduced</p>
                  </div>
                  <p className="text-lg font-bold">{(esgMetrics.totalWasteReduced / 1000).toFixed(0)}K t</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Regulatory Compliance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="w-5 h-5" />
              Regulatory Compliance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm font-medium">EU Taxonomy Alignment</p>
                  <p className="text-xs text-muted-foreground">Green Activities</p>
                </div>
                <Badge variant="outline" className="bg-green-100 dark:bg-green-950/20">
                  {euTaxonomyPercentage.toFixed(0)}%
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm font-medium">Green Bond Eligibility</p>
                  <p className="text-xs text-muted-foreground">Dark Green loans only</p>
                </div>
                <Badge variant="outline" className="bg-blue-100 dark:bg-blue-950/20">
                  €{(greenBondEligible / 1000000).toFixed(0)}M
                </Badge>
              </div>

              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
                <p className="text-xs text-blue-900 dark:text-blue-100">
                  <strong>CSRD Compliance:</strong> Portfolio {euTaxonomyPercentage.toFixed(0)}% aligned with EU Taxonomy Green Activities. Estimated compliance time saved: 120 hours/year.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GreenLendingHub;

