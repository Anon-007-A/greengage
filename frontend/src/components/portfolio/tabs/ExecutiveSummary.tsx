/**
 * Executive Summary Tab - Enhanced with rich content
 * Portfolio snapshot, gauge, metrics, composition chart, insights
 */
import { useGreenGaugeStore } from '@/store/useGreenGaugeStore';
import { usePortfolioStatus } from '@/hooks/usePortfolioStatus';
import { calculatePortfolioGreenScore } from '@/lib/greenScore';
import { calculatePortfolioHeatIndex } from '@/lib/portfolioHeatIndex';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AlertTriangle, 
  TrendingUp, 
  Leaf, 
  ArrowRight, 
  DollarSign,
  AlertCircle,
  Zap,
  FileCheck,
  TrendingDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import HeatIndexGauge from '../components/HeatIndexGauge';
import PortfolioCompositionChart from '../components/PortfolioCompositionChart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ExecutiveSummaryProps {
  onNavigate: (tab: string) => void;
}

const ExecutiveSummary = ({ onNavigate }: ExecutiveSummaryProps) => {
  const { loans, ebitdaDropPercent, interestRateHikeBps } = useGreenGaugeStore();
  const portfolioStatus = usePortfolioStatus(loans, ebitdaDropPercent, interestRateHikeBps);
  const portfolioGreenScore = calculatePortfolioGreenScore(loans, ebitdaDropPercent, interestRateHikeBps);
  const heatMetrics = calculatePortfolioHeatIndex(loans, ebitdaDropPercent, interestRateHikeBps);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  };

  // Calculate exposed value (breached loans)
  const exposedValue = portfolioStatus.loans
    .filter(ls => ls.status === 'BREACHED')
    .reduce((sum, ls) => sum + ls.loan.loanAmount, 0);

  // Get top breached loan for insights
  const topBreachedLoan = portfolioStatus.loans
    .filter(ls => ls.status === 'BREACHED')
    .sort((a, b) => b.breachCount - a.breachCount)[0];

  // Recent Insights (AI Recommendations)
  const [openInsight, setOpenInsight] = useState<number | null>(null);

  const insights = [
    {
      priority: 'CRITICAL',
      icon: Zap,
      title: 'Waiver Needed',
      description: topBreachedLoan 
        ? `${topBreachedLoan.loan.companyName} requires immediate covenant waiver`
        : 'No critical actions required',
      color: 'bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-900 text-red-900 dark:text-red-100',
      iconColor: 'text-red-600',
      impact: '€4.2M',
      recommended: 'Engage syndicate and request waiver; prepare covenant remediation plan.'
    },
    {
      priority: 'HIGH',
      icon: TrendingUp,
      title: 'Green Loans',
      description: `Increase green loan allocation by 50% to meet EU Taxonomy targets`,
      color: 'bg-orange-50 dark:bg-orange-950/20 border-orange-300 dark:border-orange-900 text-orange-900 dark:text-orange-100',
      iconColor: 'text-orange-600',
      impact: '€1.8M',
      recommended: 'Prioritise refinancing of eligible assets and create green tranches.'
    },
    {
      priority: 'ACTION',
      icon: FileCheck,
      title: 'EU Taxonomy',
      description: `Portfolio ${Math.round((portfolioStatus.darkGreenLoanCount + portfolioStatus.lightGreenLoanCount) / loans.length * 100)}% aligned with EU Taxonomy`,
      color: 'bg-blue-50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-900 text-blue-900 dark:text-blue-100',
      iconColor: 'text-blue-600',
      impact: '€2.0M',
      recommended: 'Schedule taxonomy alignment review and tag eligible loans.'
    }
  ];

  return (
    <div className="space-y-6" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Portfolio Snapshot - Two Column Layout */}
      <Card className="border-gray-200 dark:border-gray-800" style={{ 
        borderLeft: '4px solid #06A77D',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        borderRadius: '12px'
      }}>
        <CardHeader>
          <CardTitle className="text-2xl font-semibold" style={{ fontSize: '24px' }}>
            Portfolio Snapshot
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left: Heat Index Gauge (60%) */}
            <div className="lg:col-span-3">
              <HeatIndexGauge
                heatIndex={heatMetrics.heatIndex}
                breachedCount={portfolioStatus.breachedLoanCount}
                atRiskCount={portfolioStatus.atRiskLoanCount}
                safeCount={portfolioStatus.safeLoanCount}
                onViewRisk={() => onNavigate('risk')}
              />
            </div>

            {/* Right: Quick Stats (40%) */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Quick Stats
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="text-sm font-medium text-red-900 dark:text-red-100">Breached</span>
                  </div>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {portfolioStatus.breachedLoanCount}
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    <span className="text-sm font-medium text-orange-900 dark:text-orange-100">At Risk</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {portfolioStatus.atRiskLoanCount}
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                  <div className="flex items-center gap-2 mb-2">
                    <Leaf className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-900 dark:text-green-100">Safe</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {portfolioStatus.safeLoanCount}
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Exposed</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(exposedValue)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics - 6 Cards (3x2) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Row 1 */}
        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Portfolio Value */}
          <Card className="border-gray-200 dark:border-gray-800" style={{ borderLeft: '4px solid #06A77D', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', borderRadius: '12px' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-6 h-6" style={{ color: '#06A77D' }} />
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-sm mb-1" style={{ color: '#6B7280' }}>Portfolio Value</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100" style={{ fontSize: '32px' }}>{formatCurrency(portfolioStatus.totalPortfolioValue)}</p>
              <p className="text-xs mt-2 text-green-600">↗ +2% vs last month</p>
            </CardContent>
          </Card>

          {/* 1 Breached Loans */}
          <Card className="border-gray-200 dark:border-gray-800" style={{ borderLeft: '4px solid #DC3545', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', borderRadius: '12px' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="w-6 h-6" style={{ color: '#DC3545' }} />
              </div>
              <p className="text-sm mb-1" style={{ color: '#6B7280' }}>Breached</p>
              <p className="text-3xl font-bold" style={{ color: '#DC3545', fontSize: '32px' }}>{portfolioStatus.breachedLoanCount}</p>
              <p className="text-xs mt-2 text-red-600">Requires waiver</p>
            </CardContent>
          </Card>

          {/* 2 At Risk */}
          <Card className="border-gray-200 dark:border-gray-800" style={{ borderLeft: '4px solid #FF9F43', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', borderRadius: '12px' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="w-6 h-6" style={{ color: '#FF9F43' }} />
              </div>
              <p className="text-sm mb-1" style={{ color: '#6B7280' }}>At Risk</p>
              <p className="text-3xl font-bold" style={{ color: '#FF9F43', fontSize: '32px' }}>{portfolioStatus.atRiskLoanCount}</p>
              <p className="text-xs mt-2 text-orange-600">Monitor closely</p>
            </CardContent>
          </Card>
        </div>

        {/* Row 2 */}
        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 2 Safe */}
          <Card className="border-gray-200 dark:border-gray-800" style={{ borderLeft: '4px solid #28A745', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', borderRadius: '12px' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Leaf className="w-6 h-6" style={{ color: '#28A745' }} />
              </div>
              <p className="text-sm mb-1" style={{ color: '#6B7280' }}>Safe</p>
              <p className="text-3xl font-bold text-green-600" style={{ fontSize: '32px' }}>{portfolioStatus.safeLoanCount}</p>
              <p className="text-xs mt-2 text-green-600">Stable</p>
            </CardContent>
          </Card>

          {/* 84/100 Green Score */}
          <Card className="border-gray-200 dark:border-gray-800" style={{ borderLeft: '4px solid #06A77D', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', borderRadius: '12px' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Leaf className="w-6 h-6" style={{ color: '#06A77D' }} />
              </div>
              <p className="text-sm mb-1" style={{ color: '#6B7280' }}>Green Score</p>
              <p className="text-3xl font-bold" style={{ color: '#06A77D', fontSize: '32px' }}>{Math.round(portfolioGreenScore)}/100</p>
              <p className="text-xs mt-2 text-teal-600">Industry benchmark</p>
            </CardContent>
          </Card>

          {/* 5 Total Loans */}
          <Card className="border-gray-200 dark:border-gray-800" style={{ borderLeft: '4px solid #9CA3AF', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', borderRadius: '12px' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-6 h-6" style={{ color: '#6B7280' }} />
              </div>
              <p className="text-sm mb-1" style={{ color: '#6B7280' }}>Total Loans</p>
              <p className="text-3xl font-bold text-gray-900" style={{ fontSize: '32px' }}>{portfolioStatus.totalLoanCount}</p>
              <p className="text-xs mt-2 text-gray-600">Portfolio count</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Key Covenant Details */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Key Covenant Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Top 3 breaches - show small cards */}
          {[
            { title: 'EcoTransport', covenant: 'LLCR Breach', status: 'Requires Waiver', pct: -8.5, color: 'border-red-400 bg-red-50' },
            { title: 'SolarGrid', covenant: 'DSCR Breach', status: 'Immediate Action', pct: -15, color: 'border-red-500 bg-red-50' },
            { title: 'WindTech', covenant: 'Interest Coverage', status: 'Safe', pct: 12, color: 'border-green-400 bg-green-50' }
          ].map((c, i) => (
            <div key={i} className={`p-4 rounded-lg border-l-4 ${c.color} shadow-sm`}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-semibold">{c.title}</div>
                  <div className="text-xs text-gray-500">{c.covenant}</div>
                </div>
                <div className="text-sm font-medium">{c.status}</div>
              </div>
              <div className="text-xs text-gray-600">{c.pct}% vs threshold</div>
            </div>
          ))}
        </div>
      </div>

      {/* Portfolio Composition Chart */}
      <Card className="border-gray-200 dark:border-gray-800" style={{ 
        borderLeft: '4px solid #06A77D',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        borderRadius: '12px'
      }}>
        <CardHeader>
          <CardTitle className="text-2xl font-semibold" style={{ fontSize: '24px' }}>
            Portfolio Composition
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PortfolioCompositionChart
            loans={loans}
            ebitdaDropPercent={ebitdaDropPercent}
            interestRateHikeBps={interestRateHikeBps}
          />
        </CardContent>
      </Card>

      {/* Recent Insights */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4" style={{ fontSize: '24px' }}>
          Recent Insights
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {insights.map((insight, idx) => {
            const Icon = insight.icon;
            return (
              <Card 
                key={idx} 
                className={cn('border-2 cursor-pointer transition-all duration-200 hover:shadow-lg', insight.color)}
                style={{ 
                  borderRadius: '12px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)';
                }}
                onClick={() => setOpenInsight(idx)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Icon className={cn('w-6 h-6', insight.iconColor)} />
                      <span className="font-semibold text-sm">{insight.priority}</span>
                    </div>
                    <Badge>{insight.impact}</Badge>
                  </div>
                  <h3 className="font-semibold text-base mb-2">{insight.title}</h3>
                  <p className="text-sm opacity-80 mb-4">{insight.description}</p>
                  <div className="text-xs text-gray-600">Hover to see recommended action</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Insight Modal */}
        {openInsight !== null && (
          <Dialog open={true} onOpenChange={() => setOpenInsight(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold">{insights[openInsight].title}</DialogTitle>
              </DialogHeader>
              <div className="p-4">
                <p className="text-sm text-gray-700 mb-3">{insights[openInsight].description}</p>
                <h4 className="font-semibold">Recommended Action</h4>
                <p className="text-sm text-gray-600 mb-4">{insights[openInsight].recommended}</p>
                <div className="flex gap-2">
                  <Button onClick={() => { setOpenInsight(null); onNavigate('risk'); }} style={{ backgroundColor: '#06A77D', color: 'white' }}>Take Action</Button>
                  <Button variant="outline" onClick={() => setOpenInsight(null)}>Close</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* AI Risk Predictions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">AI Risk Predictions (Next 60 Days)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { loan: 'SolarGrid', prob: 78, days: '30 days', trend: 'up', color: '#DC3545' },
            { loan: 'WindTech', prob: 0, days: 'N/A', trend: 'stable', color: '#28A745' },
            { loan: 'EcoTransport', prob: 45, days: '60 days', trend: 'up', color: '#FF9F43' }
          ].map((p, i) => (
            <Card key={i} className="border-gray-200" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)', borderRadius: '12px' }}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold">{p.loan}</div>
                  <div className="text-sm font-bold" style={{ color: p.color }}>{p.prob}%</div>
                </div>
                <div className="text-xs text-gray-600">Breach probability: {p.days}</div>
                <div className="text-xs text-gray-500 mt-1">Trend: {p.trend}</div>
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Probability chart */}
        <div className="mt-6 bg-white p-6 rounded-lg border border-gray-200" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={[
              { day: 'Day 0', SolarGrid: 40, EcoTransport: 20, WindTech: 0 },
              { day: 'Day 15', SolarGrid: 55, EcoTransport: 30, WindTech: 0 },
              { day: 'Day 30', SolarGrid: 78, EcoTransport: 35, WindTech: 0 },
              { day: 'Day 45', SolarGrid: 82, EcoTransport: 42, WindTech: 1 },
              { day: 'Day 60', SolarGrid: 85, EcoTransport: 45, WindTech: 2 }
            ]}>
              <CartesianGrid stroke="#E5E7EB" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="SolarGrid" stroke="#DC3545" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="EcoTransport" stroke="#FF9F43" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="WindTech" stroke="#28A745" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Action Buttons - Footer */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          onClick={() => onNavigate('risk')}
          className="flex-1 h-14 text-base font-medium transition-all duration-200 hover:shadow-lg"
          style={{ 
            backgroundColor: '#06A77D',
            color: '#FFFFFF',
            borderRadius: '8px',
            fontSize: '16px',
            padding: '12px 24px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#059669';
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#06A77D';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          📊 View Risk Analysis
        </Button>
        <Button
          onClick={() => onNavigate('green')}
          variant="outline"
          className="flex-1 h-14 text-base font-medium transition-all duration-200 hover:shadow-lg"
          style={{ 
            borderColor: '#06A77D',
            borderWidth: '2px',
            color: '#06A77D',
            borderRadius: '8px',
            fontSize: '16px',
            padding: '12px 24px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#F0FDF4';
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          🟢 Green Financing
        </Button>
        <Button
          onClick={() => onNavigate('stress')}
          variant="outline"
          className="flex-1 h-14 text-base font-medium transition-all duration-200 hover:shadow-lg"
          style={{ 
            borderColor: '#E5E7EB',
            borderWidth: '2px',
            color: '#6B7280',
            borderRadius: '8px',
            fontSize: '16px',
            padding: '12px 24px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#F9FAFB';
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          ⚡ Stress Test
        </Button>
        <Button
          variant="outline"
          className="flex-1 h-14 text-base font-medium transition-all duration-200 hover:shadow-lg"
          style={{ 
            borderColor: '#E5E7EB',
            borderWidth: '2px',
            color: '#6B7280',
            borderRadius: '8px',
            fontSize: '16px',
            padding: '12px 24px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#F9FAFB';
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          📥 Export
        </Button>
      </div>
    </div>
  );
};

export default ExecutiveSummary;
