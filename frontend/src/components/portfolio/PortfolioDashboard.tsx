/**
 * Portfolio Dashboard - Tabbed Interface
 * Main dashboard with 5 tabs: Summary | Risk | Green | Stress | Advanced
 */
import { useSearchParams } from 'react-router-dom';
import { Suspense } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ExecutiveSummaryAPI from './tabs/ExecutiveSummaryAPI';
import PortfolioRiskAPI from './tabs/PortfolioRiskAPI';
import GreenFinancing from './tabs/GreenFinancing';
import StressTestAPI from './tabs/StressTestAPI';
import Advanced from './tabs/Advanced';
import ErrorBoundary from '@/components/ErrorBoundary';
import { cn } from '@/lib/utils';

type TabId = 'summary' | 'risk' | 'green' | 'stress' | 'advanced';

const tabs: { id: TabId; label: string }[] = [
  { id: 'summary', label: 'Summary' },
  { id: 'risk', label: 'Risk' },
  { id: 'green', label: 'Green' },
  { id: 'stress', label: 'Stress' },
  { id: 'advanced', label: 'Advanced' },
];

const PortfolioDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') || 'summary') as TabId;

  const handleTabChange = (tabId: TabId) => {
    setSearchParams({ tab: tabId });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'summary':
        return <ExecutiveSummaryAPI onNavigate={handleTabChange} />;
      case 'risk':
        return <PortfolioRiskAPI onNavigate={handleTabChange} />;
      case 'green':
        return <GreenFinancing onNavigate={handleTabChange} />;
      case 'stress':
        return <StressTestAPI onNavigate={handleTabChange} />;
      case 'advanced':
        return <Advanced onNavigate={handleTabChange} />;
      default:
        return <ExecutiveSummaryAPI onNavigate={handleTabChange} />;
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-[1200px] mx-auto" style={{ padding: '40px 32px', fontFamily: 'Inter, sans-serif' }}>
        {/* Sticky Tab Navigation - White background with teal underline */}
        <div 
          className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800 mb-8 -mx-8 px-8 pb-0" 
          style={{ 
            fontFamily: 'Inter, sans-serif',
            backgroundColor: '#FFFFFF',
            paddingTop: '16px',
            paddingBottom: '0'
          }}
        >
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  'px-5 py-3 font-medium transition-all duration-200 border-b-2 whitespace-nowrap',
                  activeTab === tab.id
                    ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300'
                )}
                style={{
                  fontSize: '16px',
                  fontWeight: activeTab === tab.id ? 600 : 400,
                  color: activeTab === tab.id ? '#06A77D' : '#6B7280',
                  borderBottomColor: activeTab === tab.id ? '#06A77D' : 'transparent',
                  borderBottomWidth: '2px',
                  padding: '12px 20px'
                }}
                aria-label={`Switch to ${tab.label} tab`}
                aria-selected={activeTab === tab.id}
                role="tab"
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in" style={{ transition: 'opacity 200ms ease-in-out' }}>
          <ErrorBoundary>
            <Suspense fallback={<div className="p-6 text-center">Loading summary...</div>}>
              {renderTabContent()}
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PortfolioDashboard;

