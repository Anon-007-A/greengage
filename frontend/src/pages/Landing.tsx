import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Shield, 
  TrendingUp, 
  Leaf, 
  BarChart3, 
  CheckCircle2, 
  ArrowRight,
  Building2,
  FileCheck,
  AlertTriangle,
  Zap
} from 'lucide-react';

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border" style={{ background: 'var(--gradient-hero)', opacity: 0.95 }}>
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Leaf className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="font-display text-2xl font-bold text-foreground">GreenGauge</span>
              {/* Live Demo Badge */}
              <div className="ml-3 badge-live">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                <span className="font-medium">Live Demo</span>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <Link to="/how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">How It Works</Link>
              <a href="#compliance" className="text-muted-foreground hover:text-foreground transition-colors">Compliance</a>
            </div>
            <Link to="/dashboard">
              <Button className="gap-2 hover-lift">
                Launch Dashboard
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-hero-pattern" style={{ background: 'var(--gradient-hero)' }}>
          <div className="absolute inset-0 bg-hero-pattern opacity-30" />
          {/* Floating orbs */}
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/2 right-1/3 w-48 h-48 bg-primary/10 rounded-full blur-2xl animate-float" style={{ animationDelay: '4s' }} />
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-8 animate-fade-in-up">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-medium">EU Taxonomy & CSRD Compliant</span>
            </div>
            
            <h1 className="font-display text-5xl md:text-7xl font-bold text-primary-foreground mb-6 animate-fade-in-up stagger-1 text-balance">
              Monitor Green Loans.
              <br />
              <span className="text-accent">Reduce Risk.</span>
              <br />
              Prove Impact.
            </h1>
            
            <p className="text-xl text-primary-foreground/80 mb-10 max-w-2xl mx-auto animate-fade-in-up stagger-2">
              The unified dashboard that combines covenant health monitoring with ESG impact tracking—giving you a complete risk picture for your green loan portfolio.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up stagger-3">
              <Link to="/dashboard">
                <Button size="lg" className="text-lg px-8 py-6 gap-2 hover-lift hover-glow">
                  <BarChart3 className="w-5 h-5" />
                  Explore Dashboard
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6 bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/20">
                  See How It Works
                </Button>
              </a>
            </div>

            {/* Stats Bar */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 animate-fade-in-up stagger-4">
              {[
                { value: '€225M', label: 'Portfolio Monitored' },
                { value: '5', label: 'Active Loans' },
                { value: '45K', label: 'Tonnes CO₂ Reduced' },
                { value: '1.03 GWh', label: 'Clean Energy Generated' },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl md:text-4xl font-display font-bold text-primary-foreground">{stat.value}</div>
                  <div className="text-sm text-primary-foreground/60">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-primary-foreground/30 flex items-start justify-center p-2">
            <div className="w-1 h-2 bg-primary-foreground/50 rounded-full" />
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-24 bg-card">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="font-display text-4xl font-bold text-foreground mb-6">
              The Green Lending Challenge
            </h2>
            <p className="text-lg text-muted-foreground">
              Banks face mounting pressure from regulators, investors, and the market to prove their green loans deliver real impact—while managing traditional credit risk.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: AlertTriangle,
                title: 'Fragmented Data',
                description: 'Covenant tracking in one system, ESG metrics in spreadsheets, risk in another platform. No unified view.',
                color: 'text-warning'
              },
              {
                icon: FileCheck,
                title: 'CSRD Compliance',
                description: 'New EU regulations require detailed sustainability reporting with auditable data trails.',
                color: 'text-danger'
              },
              {
                icon: TrendingUp,
                title: 'Hidden Correlations',
                description: 'ESG underperformance often precedes financial distress—but these signals are missed when data is siloed.',
                color: 'text-accent'
              }
            ].map((item, i) => (
              <Card key={i} className="hover-lift border-none shadow-lg animate-fade-in-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <CardContent className="p-8">
                  <div className={`w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-6 ${item.color}`}>
                    <item.icon className="w-7 h-7" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-foreground mb-3">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-background">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="font-display text-4xl font-bold text-foreground mb-6">
              One Dashboard. Complete Visibility.
            </h2>
            <p className="text-lg text-muted-foreground">
              GreenGauge unifies covenant monitoring and ESG impact tracking into a single risk score—so you can spot problems before they become crises.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                title: 'Covenant Monitoring',
                description: 'Real-time tracking of debt-to-EBITDA, DSCR, and other financial covenants with breach forecasting.',
                features: ['Days-to-breach countdown', 'Trend analysis', 'Threshold alerts']
              },
              {
                icon: Leaf,
                title: 'ESG Impact Tracking',
                description: 'Monitor environmental metrics against targets with verification status tracking.',
                features: ['CO₂ reduction', 'Energy generation', 'Third-party verification']
              },
              {
                icon: BarChart3,
                title: 'Combined Risk Score',
                description: 'Proprietary algorithm weighing covenant health (60%) and ESG progress (40%).',
                features: ['0-100 risk scale', 'Component breakdown', 'Trend indicators']
              },
              {
                icon: Building2,
                title: 'Portfolio Overview',
                description: 'Bird\'s-eye view of all loans with sortable, filterable data and drill-down capability.',
                features: ['Status badges', 'Quick filters', 'Export options']
              },
              {
                icon: FileCheck,
                title: 'CSRD Reports',
                description: 'Generate compliance-ready reports with full audit trails and EU Taxonomy alignment.',
                features: ['One-click export', 'Audit trail', 'Regulatory formatting']
              },
              {
                icon: TrendingUp,
                title: 'Smart Recommendations',
                description: 'AI-powered suggestions for risk mitigation based on portfolio patterns.',
                features: ['Priority actions', 'Escalation triggers', 'Best practices']
              }
            ].map((feature, i) => (
              <Card key={i} className="group hover-lift border-border/50 animate-fade-in-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <CardContent className="p-8">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-foreground mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground mb-4">{feature.description}</p>
                  <ul className="space-y-2">
                    {feature.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-card">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="font-display text-4xl font-bold text-foreground mb-6">
              How GreenGauge Works
            </h2>
            <p className="text-lg text-muted-foreground">
              From data ingestion to actionable insights in three simple steps.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            {[
              {
                step: '01',
                title: 'Connect Your Data',
                description: 'Import covenant data from your loan management system and ESG metrics from borrower submissions or verification providers.'
              },
              {
                step: '02',
                title: 'Monitor in Real-Time',
                description: 'GreenGauge calculates combined risk scores, forecasts covenant breaches, and tracks ESG progress against targets continuously.'
              },
              {
                step: '03',
                title: 'Act on Insights',
                description: 'Receive smart recommendations, generate compliance reports, and take proactive action before problems escalate.'
              }
            ].map((item, i) => (
              <div key={i} className="flex gap-8 mb-12 last:mb-0 animate-fade-in-up" style={{ animationDelay: `${i * 0.2}s` }}>
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-display text-2xl font-bold">
                    {item.step}
                  </div>
                </div>
                <div>
                  <h3 className="font-display text-2xl font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-lg text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance Section */}
      <section id="compliance" className="py-24 bg-background">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="font-display text-4xl font-bold text-foreground mb-6">
                  Built for CSRD Compliance
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  GreenGauge is designed from the ground up to meet EU Corporate Sustainability Reporting Directive requirements, with built-in audit trails and EU Taxonomy alignment indicators.
                </p>
                <ul className="space-y-4">
                  {[
                    'Double materiality assessment support',
                    'Full data lineage and audit trails',
                    'EU Taxonomy alignment indicators',
                    'Third-party verification tracking',
                    'One-click compliance report generation'
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-foreground">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative">
                <div className="aspect-square rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 p-8 flex items-center justify-center">
                  <div className="w-full h-full rounded-2xl bg-card shadow-2xl p-6 flex flex-col items-center justify-center">
                    <FileCheck className="w-24 h-24 text-primary mb-4" />
                    <span className="font-display text-2xl font-bold text-foreground">CSRD Ready</span>
                    <span className="text-muted-foreground">Full Compliance Suite</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24" style={{ background: 'var(--gradient-hero)' }}>
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mb-6">
              Ready to Transform Your Green Lending?
            </h2>
            <p className="text-xl text-primary-foreground/80 mb-10">
              Experience the power of unified covenant and ESG monitoring. Launch the dashboard to explore the demo portfolio.
            </p>
            <Link to="/dashboard">
              <Button size="lg" className="text-lg px-10 py-6 gap-2 bg-primary-foreground text-primary hover:bg-primary-foreground/90 hover-lift">
                <BarChart3 className="w-5 h-5" />
                Launch Dashboard
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-card border-t border-border">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Leaf className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-bold text-foreground">GreenGauge</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Built for the 2024 Green Finance Hackathon • Sustainable Banking Innovation
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>EU Taxonomy Aligned</span>
              <span>•</span>
              <span>CSRD Compliant</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
