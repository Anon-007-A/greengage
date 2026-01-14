import { Loan } from '@/lib/api-enhanced';

export interface FilterOptions {
  query?: string;
  riskFilter?: string;
  covenantFilter?: string;
}

export const filterLoans = (loans: Loan[], opts: FilterOptions = []) => {
  const { query = '', riskFilter = 'all', covenantFilter = 'all' } = opts as any;
  let result = [...loans];
  const q = query.trim().toLowerCase();
  if (q) {
    result = result.filter(loan =>
      (loan.companyName || '').toString().toLowerCase().includes(q) ||
      (loan.id || '').toString().toLowerCase().includes(q) ||
      (((loan as any).loanAmount || (loan as any).amount) ? ((loan as any).loanAmount || (loan as any).amount).toString().toLowerCase().includes(q) : false) ||
      ((loan.covenants || []).some((c: any) => (c.name || c.type || '').toString().toLowerCase().includes(q)))
    );
  }

  if (riskFilter && riskFilter !== 'all') {
    result = result.filter(loan => (loan.status || '').toString().toLowerCase() === (riskFilter || '').toString().toLowerCase());
  }

  if (covenantFilter && covenantFilter !== 'all') {
    result = result.filter(loan => (loan.covenants || []).some((c: any) => (c.name || c.type || '').toString().toLowerCase() === covenantFilter.toString().toLowerCase()));
  }

  return result;
};

export default filterLoans;
