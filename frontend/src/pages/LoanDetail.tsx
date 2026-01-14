import { useParams, Link } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useGreenGaugeStore } from '@/store/useGreenGaugeStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, Clock, XCircle, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { logger } from '@/lib/logger';
import { generateRecommendations } from '@/utils/generateRecommendations';

const LoanDetail = () => {
  const { id } = useParams();
  const { loans } = useGreenGaugeStore();
  const loan = loans.find(l => l.id === id);

  if (!loan) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loan not found</p>
          <Link to="/dashboard">
            <Button variant="outline" className="mt-4">Back to Dashboard</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-success';
      case 'medium': return 'text-warning';
      case 'high': 
      case 'critical': return 'text-danger';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'status-healthy';
      case 'warning': return 'status-caution';
      case 'breach': return 'status-crisis';
      default: return '';
    }
  };

  const getVerificationIcon = (status: string) => {
    switch (status) {
      case 'verified': return <CheckCircle2 className="w-4 h-4 text-success" />;
      case 'pending': return <Clock className="w-4 h-4 text-warning" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-danger" />;
      default: return null;
    }
  };

  const pieData = [
    { name: 'Covenant', value: 60, score: loan.riskScore.covenantComponent },
    { name: 'ESG Impact', value: 40, score: loan.riskScore.impactComponent },
  ];

  const COLORS = ['hsl(var(--chart-blue))', 'hsl(var(--chart-green))'];

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6 animate-fade-in-up">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Portfolio
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">{loan.companyName}</h1>
            <p className="text-muted-foreground">{loan.sector} • {loan.relationshipManager}</p>
          </div>
          <div className="text-right">
            <div className={cn("text-4xl font-display font-bold", getRiskColor(loan.riskScore.level))}>
              {loan.riskScore.overall}
            </div>
            <p className="text-sm text-muted-foreground">Risk Score</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="covenants" className="animate-fade-in-up stagger-1">
        <TabsList className="mb-6">
          <TabsTrigger value="covenants">Covenant Health</TabsTrigger>
          <TabsTrigger value="esg">ESG Impact</TabsTrigger>
          <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
        </TabsList>

        {/* Covenants Tab */}
        <TabsContent value="covenants" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {loan.covenants.map((covenant) => (
              <Card key={covenant.id} className="hover-lift">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{covenant.name}</CardTitle>
                    <Badge variant="outline" className={cn("border", getStatusColor(covenant.status))}>
                      {covenant.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between mb-4">
                    <div>
                      <p className="text-3xl font-display font-bold text-foreground">
                        {covenant.currentValue}{covenant.unit}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Threshold: {covenant.operator} {covenant.threshold}{covenant.unit}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-lg font-semibold", covenant.cushionPercent > 20 ? 'text-success' : covenant.cushionPercent > 0 ? 'text-warning' : 'text-danger')}>
                        {covenant.cushionPercent > 0 ? '+' : ''}{covenant.cushionPercent}%
                      </p>
                      <p className="text-xs text-muted-foreground">Cushion</p>
                    </div>
                  </div>
                  
                  {covenant.daysToBreachEstimate !== null && covenant.daysToBreachEstimate <= 90 && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-danger/10 text-danger mb-4">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {covenant.daysToBreachEstimate === 0 ? 'Currently in breach' : `Breach estimated in ${covenant.daysToBreachEstimate} days`}
                      </span>
                    </div>
                  )}

                  <div className="h-24">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={covenant.trend.map((v, i) => ({ quarter: `Q${i + 1}`, value: v }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="quarter" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ESG Tab */}
        <TabsContent value="esg" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {loan.esgMetrics.map((metric) => (
              <Card key={metric.id} className="hover-lift">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{metric.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      {getVerificationIcon(metric.verificationStatus)}
                      <span className="text-xs text-muted-foreground capitalize">{metric.verificationStatus}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="flex items-end justify-between mb-2">
                      <p className="text-2xl font-display font-bold text-foreground">
                        {metric.currentValue.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{metric.unit}</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Target: {metric.targetValue.toLocaleString()}
                      </p>
                    </div>
                    <Progress value={metric.progressPercent} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">{metric.progressPercent}% of target</p>
                  </div>

                  <div className="h-24">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={metric.submissionHistory.map(h => ({ month: h.month.split(' ')[0], value: h.value }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke="hsl(var(--success))" strokeWidth={2} dot />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Risk Tab */}
        <TabsContent value="risk" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Risk Score Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center">
                  <div className="relative">
                    <div className="w-48 h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value">
                            {pieData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className={cn("text-4xl font-display font-bold", getRiskColor(loan.riskScore.level))}>
                          {loan.riskScore.overall}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">{loan.riskScore.level} Risk</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 space-y-3">
                  {pieData.map((item, i) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                        <span className="text-sm">{item.name} ({item.value}%)</span>
                      </div>
                      <span className="font-medium">{item.score}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-warning" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Robust recommendations rendering using generator with error handling */}
                  {
                    (() => {
                      try {
                        const mapped = {
                          name: loan.companyName,
                          riskScore: typeof loan.riskScore === 'object' ? loan.riskScore.overall : loan.riskScore || 0,
                          esgScore: loan.esgScore ?? (loan.esgMetrics && loan.esgMetrics.length ? Math.round(loan.esgMetrics.reduce((s:any,m:any)=>s+m.currentValue,0)/loan.esgMetrics.length) : 0),
                          daysUntilBreach: loan.covenants && loan.covenants.length ? (loan.covenants[0].daysToBreachEstimate ?? null) : null,
                        };

                        const recs = generateRecommendations(mapped);

                        return recs.map((r, idx) => (
                          <div key={`${r.title}-${idx}`} className="p-3 rounded-lg bg-white shadow-sm border-l-4" style={{ borderColor: r.color }}>
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{r.icon}</span>
                                  <div className="font-semibold">{r.title}</div>
                                </div>
                                <p className="text-sm text-muted-foreground mt-2">{r.description}</p>

                                {r.triggers && r.triggers.length > 0 && (
                                  <div className="mt-2 text-sm text-gray-600">
                                    <div className="font-medium text-xs text-muted-foreground">Triggered by:</div>
                                    <ul className="list-disc ml-4">
                                      {r.triggers.map((t:any, i:number) => (
                                        <li key={i}>{t.metric}: {t.value ?? '-'} {t.unit ? t.unit : ''} {t.threshold ? ` (threshold ${t.threshold})` : ''}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {r.suggestedActions && r.suggestedActions.length > 0 && (
                                  <div className="mt-2 text-sm">
                                    <div className="font-medium text-xs text-muted-foreground">Suggested actions:</div>
                                    <ul className="list-disc ml-4">
                                      {r.suggestedActions.map((a:string, i:number) => <li key={i}>{a}</li>)}
                                    </ul>
                                  </div>
                                )}

                                <div className="mt-2 text-sm text-muted-foreground">Trend: <strong className="capitalize">{r.trend || 'stable'}</strong></div>
                                {r.daysUntilBreach !== null && (
                                  <div className="mt-1 text-sm">Days until breach: <strong>{r.daysUntilBreach}</strong></div>
                                )}
                              </div>
                              <div className="flex flex-col gap-2">
                                <button onClick={() => alert(r.badge || 'Action')} className="px-3 py-1 bg-orange-50 text-orange-700 rounded">{r.badge}</button>
                              </div>
                            </div>
                          </div>
                        ));
                      } catch (error) {
                        logger.error('Recommendations render error', error);
                        return (
                          <div className="p-3 rounded-lg bg-muted/50 text-sm text-foreground">Something went wrong rendering recommendations. Please try again.</div>
                        );
                      }
                    })()
                  }
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default LoanDetail;
