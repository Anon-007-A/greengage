import { generateMockLoans } from '@/utils/mockLoans';
import { filterLoans } from '@/utils/filterLoans';

describe('Mock loans & filtering', () => {
  test('generate 150 loans', () => {
    const loans = generateMockLoans(150);
    expect(loans.length).toBe(150);
    expect(loans[0]).toHaveProperty('companyName');
  });

  test('filterLoans by company name', () => {
    const loans = generateMockLoans(20);
    const q = loans[3].companyName.split(' ')[0];
    const filtered = filterLoans(loans as any, { query: q });
    expect(filtered.length).toBeGreaterThan(0);
  });
});
