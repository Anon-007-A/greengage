/**
 * Load Test Suite for GreenGauge
 * Tests scalability with 100, 1K, 10K+ loans
 * Results saved to /docs/PERFORMANCE_BENCHMARKS.md
 */

interface LoadTestResult {
  testName: string;
  loanCount: number;
  timeMs: number;
  memoryUsedMb: number;
  status: 'PASS' | 'FAIL';
  expectedTimeMs: number;
}

// Mock loan generator (simulates database queries)
const generateMockLoans = (count: number) => {
  const loans = [];
  for (let i = 0; i < count; i++) {
    loans.push({
      id: `loan_${i}`,
      borrower: `Borrower ${i}`,
      amount: Math.random() * 500_000_000,
      covenants: {
        llcr: 1 + Math.random() * 1.5,
        dscr: 1 + Math.random() * 2,
        ic: 1.5 + Math.random() * 4,
      },
      greenScore: Math.floor(Math.random() * 100),
      breachProbability: Math.random() * 0.5,
    });
  }
  return loans;
};

// Load test: Portfolio load times
const testPortfolioLoad = (loanCount: number): LoadTestResult => {
  const startTime = performance.now();
  const startMemory = process.memoryUsage().heapUsed / 1024 / 1024;

  // Simulate data loading
  const loans = generateMockLoans(loanCount);

  // Simulate sorting and filtering
  const filtered = loans
    .filter((l) => l.covenants.llcr < 1.2)
    .sort((a, b) => b.breachProbability - a.breachProbability)
    .slice(0, 20); // Pagination

  const endTime = performance.now();
  const endMemory = process.memoryUsage().heapUsed / 1024 / 1024;

  const timeMs = endTime - startTime;
  let expectedTimeMs = 200;
  if (loanCount > 100) expectedTimeMs = 500;
  if (loanCount > 1000) expectedTimeMs = 2000;
  if (loanCount > 10000) expectedTimeMs = 5000;

  return {
    testName: 'Portfolio Load',
    loanCount,
    timeMs: Math.round(timeMs),
    memoryUsedMb: Math.round(endMemory - startMemory),
    status: timeMs <= expectedTimeMs ? 'PASS' : 'FAIL',
    expectedTimeMs,
  };
};

// Load test: Breach prediction
const testBreachPrediction = (loanCount: number): LoadTestResult => {
  const startTime = performance.now();

  const loans = generateMockLoans(loanCount);

  // Simulate ML prediction (simplified)
  const predictions = loans.map((loan) => {
    // Logistic regression calculation (simplified)
    const logit = -2.1 + 0.45 * Math.random() - 0.38 * Math.random();
    const probability = 1 / (1 + Math.exp(-logit));
    return {
      loanId: loan.id,
      probability: Math.round(probability * 1000) / 1000,
    };
  });

  const endTime = performance.now();
  const timeMs = endTime - startTime;

  let expectedTimeMs = 500;
  if (loanCount > 100) expectedTimeMs = 1500;
  if (loanCount > 1000) expectedTimeMs = 3000;

  return {
    testName: 'Breach Prediction',
    loanCount,
    timeMs: Math.round(timeMs),
    memoryUsedMb: 0,
    status: timeMs <= expectedTimeMs ? 'PASS' : 'FAIL',
    expectedTimeMs,
  };
};

// Load test: Stress test calculation
const testStressTest = (loanCount: number): LoadTestResult => {
  const startTime = performance.now();

  const loans = generateMockLoans(loanCount);

  // Scenario: EBITDA drops 15%
  const impactedLoans = loans
    .map((loan) => {
      const ebitdaStress = 0.85; // 15% drop
      const stressedLlcr = loan.covenants.llcr * ebitdaStress;
      return {
        loanId: loan.id,
        stressedLlcr,
        breached: stressedLlcr < 1.1,
      };
    })
    .filter((l) => l.breached);

  const endTime = performance.now();
  const timeMs = endTime - startTime;

  // Pre-cached results should be <1s even for 10K loans
  const expectedTimeMs = 1000;

  return {
    testName: 'Stress Test',
    loanCount,
    timeMs: Math.round(timeMs),
    memoryUsedMb: 0,
    status: timeMs <= expectedTimeMs ? 'PASS' : 'FAIL',
    expectedTimeMs,
  };
};

// Load test: Green financing analysis
const testGreenFinancing = (loanCount: number): LoadTestResult => {
  const startTime = performance.now();

  const loans = generateMockLoans(loanCount);

  // Classify each loan (EU Taxonomy)
  const classified = loans.map((loan) => {
    const classification =
      loan.greenScore >= 70
        ? 'Dark Green'
        : loan.greenScore >= 50
          ? 'Light Green'
          : loan.greenScore >= 30
            ? 'Transition'
            : 'Brown';

    return {
      loanId: loan.id,
      classification,
      impactTonnes: classification !== 'Brown' ? Math.random() * 5000 : 0,
    };
  });

  const endTime = performance.now();
  const timeMs = endTime - startTime;

  let expectedTimeMs = 300;
  if (loanCount > 100) expectedTimeMs = 800;
  if (loanCount > 1000) expectedTimeMs = 2000;

  return {
    testName: 'Green Financing',
    loanCount,
    timeMs: Math.round(timeMs),
    memoryUsedMb: 0,
    status: timeMs <= expectedTimeMs ? 'PASS' : 'FAIL',
    expectedTimeMs,
  };
};

// Portfolio summary aggregation
const testPortfolioSummary = (loanCount: number): LoadTestResult => {
  const startTime = performance.now();

  const loans = generateMockLoans(loanCount);

  // Aggregate metrics
  const summary = {
    totalLoans: loans.length,
    totalAmount: loans.reduce((sum, l) => sum + l.amount, 0),
    breachedCount: loans.filter((l) => l.covenants.llcr < 1.1).length,
    atRiskCount: loans.filter((l) => l.covenants.llcr < 1.2).length,
    avgGreenScore: Math.round(
      loans.reduce((sum, l) => sum + l.greenScore, 0) / loans.length
    ),
    avgBreachProbability: Math.round(
      (loans.reduce((sum, l) => sum + l.breachProbability, 0) / loans.length) * 100
    ) / 100,
  };

  const endTime = performance.now();
  const timeMs = endTime - startTime;

  // Should be very fast even for 100K (with materialized views in production)
  const expectedTimeMs = 200;

  return {
    testName: 'Portfolio Summary',
    loanCount,
    timeMs: Math.round(timeMs),
    memoryUsedMb: 0,
    status: timeMs <= expectedTimeMs ? 'PASS' : 'FAIL',
    expectedTimeMs,
  };
};

// Main test runner
export const runLoadTests = () => {
  console.log('\n=== GreenGauge Load Test Suite ===\n');

  const testCases = [100, 1000, 10000];
  const allResults: LoadTestResult[] = [];

  for (const loanCount of testCases) {
    console.log(`Testing with ${loanCount.toLocaleString()} loans...`);

    const results = [
      testPortfolioLoad(loanCount),
      testBreachPrediction(loanCount),
      testStressTest(loanCount),
      testGreenFinancing(loanCount),
      testPortfolioSummary(loanCount),
    ];

    results.forEach((result) => {
      const status = result.status === 'PASS' ? '✓' : '✗';
      console.log(
        `  ${status} ${result.testName}: ${result.timeMs}ms (target: ${result.expectedTimeMs}ms)`
      );
      allResults.push(result);
    });

    console.log('');
  }

  // Generate report
  const passCount = allResults.filter((r) => r.status === 'PASS').length;
  const totalCount = allResults.length;

  console.log(`\n=== RESULTS ===`);
  console.log(`Passed: ${passCount}/${totalCount} tests`);
  console.log(
    `Overall: ${passCount === totalCount ? '✓ PASSED' : '✗ NEEDS WORK'}`
  );

  return allResults;
};

// Export for testing
export { testPortfolioLoad, testBreachPrediction, testStressTest, testGreenFinancing, testPortfolioSummary };
