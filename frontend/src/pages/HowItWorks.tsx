import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Info, Settings, Activity, ArrowRight } from 'lucide-react';

const HowItWorks = () => {
  return (
    <div className="min-h-screen bg-background py-16">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <Info className="mx-auto w-12 h-12 text-primary mb-4" />
          <h1 className="font-display text-4xl font-bold text-foreground mb-4">How GreenGauge Works</h1>
          <p className="text-lg text-muted-foreground">A concise walkthrough of data flow, breach forecasting and reporting.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="p-6">
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <Settings className="w-6 h-6 text-primary" />
                <h3 className="font-semibold">Data Ingestion</h3>
              </div>
              <p className="text-sm text-muted-foreground">Connect loan systems, upload borrower ESG proofs, and map covenants for continuous monitoring.</p>
            </CardContent>
          </Card>

          <Card className="p-6">
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <Activity className="w-6 h-6 text-primary" />
                <h3 className="font-semibold">Real-Time Monitoring</h3>
              </div>
              <p className="text-sm text-muted-foreground">`usePortfolioStatus` centralizes covenant math; the breach predictor forecasts days-to-breach so you can prioritize actions.</p>
            </CardContent>
          </Card>

          <Card className="p-6">
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <ArrowRight className="w-6 h-6 text-primary" />
                <h3 className="font-semibold">Action & Reporting</h3>
              </div>
              <p className="text-sm text-muted-foreground">Generate CSRD-ready PDFs, export filtered data, and surface prioritized recommendations for remediation.</p>
            </CardContent>
          </Card>
        </div>

        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-2xl font-bold text-foreground mb-4">Quick Technical Notes</h2>
          <ul className="text-left text-muted-foreground space-y-3 mb-8">
            <li>- `usePortfolioStatus` is the single source of truth for covenant status and portfolio aggregates.</li>
            <li>- `predictPortfolioBreachTimelines` supplies per-loan days-to-breach for the timeline and table.</li>
            <li>- PDF exports include breached and at-risk details, cushion metrics and a CSRD checklist for auditability.</li>
          </ul>

          <div className="flex justify-center gap-4">
            <Link to="/dashboard">
              <Button className="hover-lift">Open Dashboard</Button>
            </Link>
            <Link to="/reports">
              <Button variant="outline">View Reports</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;
