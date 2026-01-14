// Lightweight id generator to avoid adding dependencies
const makeId = (prefix: string, i: number) => `${prefix}-${i}-${Math.floor(Math.random()*90000)+10000}`;

const sectors = ['Agriculture','Renewable Energy','Water','Construction','Transportation','Technology','Manufacturing','Healthcare'];
const covTypes = ['DSCR','LLCR','Interest Coverage','Leverage Ratio','Current Ratio'];

const rand = (min:number,max:number) => Math.floor(Math.random()*(max-min+1))+min;

export const generateMockLoans = (count = 150) => {
  const loans: any[] = [];
  for (let i=0;i<count;i++){
    const amount = rand(5,150) * 1_000_000; // 5M - 150M
    const sector = sectors[Math.floor(Math.random()*sectors.length)];
    const covenantCount = rand(1,3);
    const covenants = Array.from({length:covenantCount}).map((_,j)=>{
      const name = covTypes[Math.floor(Math.random()*covTypes.length)];
      const statusRand = Math.random();
      const status = statusRand < 0.7 ? 'active' : statusRand < 0.9 ? 'watchlist' : 'breached';
      return {
        id: makeId('cov', i*10 + j),
        name,
        status,
        cushionPercent: rand(0,50),
        daysToBreachEstimate: status === 'breached' ? 0 : rand(5,120),
      };
    });

    // status distribution roughly: 70% active, 20% watchlist, 10% breached
    const statusRand = Math.random();
    const status = statusRand < 0.7 ? 'active' : statusRand < 0.9 ? 'watchlist' : 'breached';

    const risk = Math.max(1, Math.min(100, Math.round((amount/1_000_000)/1.5 + rand(-20,20))));

    loans.push({
      id: makeId('loan', i),
      companyName: `Company ${i+1}`,
      company: `Company ${i+1}`,
      sector,
      loanAmount: amount,
      amount,
      currency: 'EUR',
      originationDate: new Date(Date.now()-rand(0,3650)*24*3600*1000).toISOString(),
      maturityDate: new Date(Date.now()+rand(365,3650)*24*3600*1000).toISOString(),
      interestRate: +(rand(100,800)/100).toFixed(2),
      status,
      relationshipManager: `RM ${rand(1,10)}`,
      lastReviewDate: new Date().toISOString(),
      covenants,
      esgMetrics: [],
      riskScore: { overall: risk, covenantComponent: Math.round(risk*0.6), impactComponent: Math.round(risk*0.4), level: risk>=75?'high':risk>=50?'medium':'low', trend: 'stable', recommendations: [], lastCalculated: new Date().toISOString() },
      // compatibility
      daysToBreachEstimate: Math.min(...covenants.map(c=>c.daysToBreachEstimate||9999)),
    });
  }
  return loans;
};

export default generateMockLoans;
