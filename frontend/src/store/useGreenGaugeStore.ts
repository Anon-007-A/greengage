import { create } from 'zustand';
import { GreenLoan, Notification } from '@/types/greenLoan';
import { mockLoans, mockNotifications } from '@/data/generatedMockLoans';

interface GreenGaugeState {
  // Data
  loans: GreenLoan[];
  notifications: Notification[];
  selectedLoanId: string | null;
  
  // UI State
  sidebarCollapsed: boolean;
  darkMode: boolean;
  searchQuery: string;
  filterStatus: 'all' | 'active' | 'watchlist' | 'default';
  viewMode: 'portfolio' | 'single';
  
  // Stress Test Parameters
  ebitdaDropPercent: number;
  interestRateHikeBps: number;
  // Active scenario and persisted results
  activeScenario: 'baseline' | 'stressed';
  scenarioParams: { ebitdaDropPercent: number; interestRateHikeBps: number } | null;
  scenarioSummary: {
    totalLoans: number;
    loans_breached: number;
    loans_at_risk: number;
    loans_safe: number;
  } | null;
  
  // Drill-down State
  selectedCovenant: { loanId: string; covenantId: string } | null;
  showDrillDown: boolean;
  
  // Actions
  setSelectedLoan: (id: string | null) => void;
  toggleSidebar: () => void;
  toggleDarkMode: () => void;
  setSearchQuery: (query: string) => void;
  setFilterStatus: (status: 'all' | 'active' | 'watchlist' | 'default') => void;
  setViewMode: (mode: 'portfolio' | 'single') => void;
  setStressTestParams: (ebitdaDrop: number, rateHike: number) => void;
  setActiveScenario: (mode: 'baseline' | 'stressed', params?: { ebitdaDropPercent: number; interestRateHikeBps: number } | null) => void;
  setScenarioSummary: (summary: { totalLoans: number; loans_breached: number; loans_at_risk: number; loans_safe: number } | null) => void;
  setSelectedCovenant: (loanId: string | null, covenantId: string | null) => void;
  addLoan: (loan: GreenLoan) => void;
  setLoans: (loans: GreenLoan[]) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  
  // Computed
  getSelectedLoan: () => GreenLoan | undefined;
  getFilteredLoans: () => GreenLoan[];
  getUnreadNotificationCount: () => number;
}

let __internalSet: any = null;
export const useGreenGaugeStore = create<GreenGaugeState>((set, get) => {
  __internalSet = set;
  return ({
    // Initial data
    loans: mockLoans,
    notifications: mockNotifications,
    selectedLoanId: null,
  
    // UI State
    sidebarCollapsed: false,
    // initialize darkMode from localStorage when available
    darkMode: (typeof window !== 'undefined' && localStorage.getItem('greengauge_dark') === 'true') || false,
    searchQuery: '',
    filterStatus: 'all',
    viewMode: 'portfolio',
  
    // Stress Test Parameters
    ebitdaDropPercent: 0,
    interestRateHikeBps: 0,
    // Active scenario defaults to baseline
    activeScenario: 'baseline',
    scenarioParams: null,
    scenarioSummary: null,
  
    // Drill-down State
    selectedCovenant: null,
    showDrillDown: false,
  
    // Actions
    setSelectedLoan: (id) => set({ selectedLoanId: id }),
  
    toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  
    toggleDarkMode: () => set((state) => {
      const newDarkMode = !state.darkMode;
      if (newDarkMode) {
        document.documentElement.classList.add('dark');
        try { localStorage.setItem('greengauge_dark', 'true'); } catch (e) { }
      } else {
        document.documentElement.classList.remove('dark');
        try { localStorage.setItem('greengauge_dark', 'false'); } catch (e) { }
      }
      return { darkMode: newDarkMode };
    }),
  
    setSearchQuery: (query) => set({ searchQuery: query }),
    resetSearch: () => set({ searchQuery: '' }),
  
    setFilterStatus: (status) => set({ filterStatus: status }),
  
    setViewMode: (mode) => set({ viewMode: mode }),
  
    setStressTestParams: (ebitdaDrop, rateHike) => set({
      ebitdaDropPercent: ebitdaDrop,
      interestRateHikeBps: rateHike
    }),

    setActiveScenario: (mode, params) => set({
      activeScenario: mode,
      scenarioParams: params || null
    }),

    setScenarioSummary: (summary) => set({ scenarioSummary: summary }),
  
    setSelectedCovenant: (loanId, covenantId) => set({
      selectedCovenant: loanId && covenantId ? { loanId, covenantId } : null,
      showDrillDown: !!(loanId && covenantId)
    }),
  
    addLoan: (loan) => set((state) => ({
      loans: [...state.loans, loan]
    })),
  
    setLoans: (loans) => set({ loans }),
  
    markNotificationRead: (id) => set((state) => ({
      notifications: state.notifications.map(n =>
        n.id === id ? { ...n, read: true } : n
      )
    })),
  
    markAllNotificationsRead: () => set((state) => ({
      notifications: state.notifications.map(n => ({ ...n, read: true }))
    })),
  
    // Computed
    getSelectedLoan: () => {
      const { loans, selectedLoanId } = get();
      return loans.find(loan => loan.id === selectedLoanId);
    },
  
    getFilteredLoans: () => {
      const { loans, searchQuery, filterStatus } = get();
      const q = searchQuery.trim().toLowerCase();
      return loans.filter(loan => {
        // Filter by UI filter status if set
        if (filterStatus !== 'all') {
          const s = (loan.status || '').toString().toLowerCase();
          const matches = ((): boolean => {
            switch (filterStatus) {
              case 'active':
                return ['active', 'compliant', 'safe'].includes(s);
              case 'watchlist':
                return ['watchlist', 'at_risk', 'warning'].includes(s);
              case 'default':
                return ['default', 'breached', 'breach'].includes(s);
            default:
              // allow direct matches for other values
              return s === (String(filterStatus || '')).toLowerCase();
            }
          })();
          if (!matches) return false;
        }

        if (!q) return true;

        // match company, sector, covenants and other common fields
        try {
          const { matchesQuery } = require('@/lib/searchUtils');
          if (matchesQuery(loan, q)) return true;
        } catch (e) {
          // fallback to older behavior
          if (loan.companyName.toLowerCase().includes(q) || loan.sector.toLowerCase().includes(q)) return true;
          if (loan.covenants && loan.covenants.some((c: any) => c.name.toLowerCase().includes(q))) return true;
        }

        // match risk status words
        if (q.includes('at risk') || q === 'atrisk') {
          if (loan.covenants.some((c: any) => c.status === 'at_risk')) return true;
        }
        if (q === 'breached' || q === 'breach') {
          if (loan.covenants.some((c: any) => c.status === 'breached')) return true;
        }

        return false;
      });
    },
  
    getUnreadNotificationCount: () => {
      const { notifications } = get();
      return notifications.filter(n => !n.read).length;
    }
  })
});

// Allow external modules (e.g., PortfolioContext) to push updates into the legacy store
export function updateStoreLoansFromExternal(loans: GreenLoan[]) {
  if (__internalSet) __internalSet({ loans });
}

export function updateStoreStressParamsFromExternal(ebitdaDrop: number, interestRateHike: number) {
  if (__internalSet) __internalSet({ ebitdaDropPercent: ebitdaDrop, interestRateHikeBps: interestRateHike });
}

export function updateStoreScenarioSummaryFromExternal(summary: any) {
  if (__internalSet) __internalSet({ scenarioSummary: summary });
}

