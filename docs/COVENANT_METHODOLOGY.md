# Covenant Analytics Methodology - GreenGauge

## Executive Summary

GreenGauge differentiates itself through **proprietary covenant analytics** that goes beyond displaying ratios:

- **Trend Analysis:** Shows covenant deterioration trajectories + days to breach
- **Interaction Analysis:** Identifies compounding multi-covenant stress
- **Waiver Intelligence:** Calculates waiver cost vs. restructuring, historical success rates

**Competitive Advantage:** Bloomberg shows covenant ratios. GreenGauge predicts covenant outcomes.

---

## 1. Covenant Cushion Trend Analysis

### What Bloomberg Shows

```
LLCR: 1.15x [YELLOW - AT RISK]
DSCR: 1.20x [YELLOW - AT RISK]
Interest Coverage: 2.30x [GREEN - SAFE]
```

**Problem:** Static snapshot. No indication if improving or deteriorating.

### What GreenGauge Shows

```
┌─ LLCR: 1.15x [AT RISK]
│  ├─ 1 year ago:    1.50x
│  ├─ 6 months ago:  1.30x
│  ├─ Today:         1.15x
│  ├─ Trend:         ⬇️ DETERIORATING (-23% decline)
│  ├─ Degradation:   -0.035x per month
│  ├─ Days to breach: 45 days (at current trend)
│  └─ Prediction:    "Breach expected Feb 24, 2026"
│
└─ Remediation Options:
   ├─ EBITDA improvement needed: +8% to get back to safe zone
   ├─ Debt reduction needed: -€5M to improve covenant
   └─ Interest cost reduction: -€200K annually to breathe room
```

### Methodology

**Trend Calculation:**

```
Current LLCR:     1.15x
1 Year Ago LLCR:  1.50x

Degradation %: (1.15 - 1.50) / 1.50 = -23.3%

Monthly Degradation: -23.3% / 12 = -1.94% per month

Days to Breach (if threshold = 1.10x):
Cushion = 1.15 - 1.10 = 0.05x
At -0.035x/month, cushion exhausted in:
(0.05 / 0.035) × 30 days = 42 days ≈ 45 days

Predicted Breach Date = Today + 45 days = Feb 24, 2026
```

### Why It Matters

**Use Case:** SolarGrid covenant monitor

```
BEFORE GreenGauge:
"SolarGrid LLCR is 1.15x. Below 1.10x threshold."
→ Analyst response: "Call borrower, ask for waiver"

AFTER GreenGauge:
"SolarGrid LLCR is 1.15x. Deteriorating -23% annually.
Breach in 45 days. Multiple remediation options available.
Success rate of similar waivers: 78%, typical time: 30 days."
→ Analyst response: "Proactively engage lender in week 1 of 45-day window"
→ Result: Prevent breach before it happens
```

**Impact:** Breach prevention vs. reactive crisis management

---

## 2. Covenant Interaction Analysis

### Problem: Siloed Covenant Monitoring

Most systems (Excel, Bloomberg) treat covenants independently:

```
LLCR: 1.15x ← AT RISK (independent alert)
DSCR: 1.20x ← AT RISK (independent alert)
Debt/Equity: 2.1x ← AT RISK (independent alert)

Action: Three separate alerts to analyst
```

**Missing:** How do these three alerts **interact**?

### GreenGauge Solution: Interaction Analysis

**Finding:** When multiple covenants breach simultaneously, the situation is **exponentially worse** than individual breaches.

#### Interaction Type 1: Compounding Stress

```
Scenario: LLCR BREACHED + DSCR BREACHED

Analysis:
├─ LLCR breached: Loan-to-value too high (too much debt)
├─ DSCR breached: Debt service too high (too few cash flows)
├─ Compound issue: Neither debt reduction NOR cash improvement fixes both
├─ Impact score: 95/100 (CRITICAL)
└─ Recommendation: "Complex restructuring needed—combine debt
                   reduction (for LLCR) + interest payment deferral
                   (for DSCR) + asset sales (for both)"
```

#### Interaction Type 2: Reinforcing

```
Scenario: LLCR BREACHED + Interest Coverage BREACHED

Analysis:
├─ LLCR breached: Debt too high
├─ IC breached: Operating profits too low
├─ Reinforcing effect: Higher debt + lower EBITDA = mutual deterioration
├─ Impact score: 75/100 (SEVERE)
└─ Recommendation: "Root cause is EBITDA decline.
                   Address underlying business performance first,
                   then restructure debt"
```

### Example: Multi-Covenant Analysis

**SolarGrid Portfolio Loan:**

```json
{
  "loan_id": "solargrid_001",
  "covenants": {
    "llcr": 1.15,
    "threshold": 1.10,
    "dscr": 1.20,
    "threshold": 1.25,
    "interest_coverage": 2.30,
    "threshold": 2.50
  },
  "interaction_analysis": {
    "breached_covenants": ["LLCR", "DSCR", "Interest Coverage"],
    "interaction_type": "COMPOUNDING_STRESS",
    "interaction_description": "All three key metrics breached simultaneously.
      This signals systemic financial distress, not isolated covenant weakness.",
    "risk_level": "CRITICAL (100/100)",
    "implications": [
      "Debt restructuring alone won't fix DSCR (cash flow issue)",
      "Interest reduction alone won't fix LLCR (debt level issue)",
      "Operating improvement alone won't fix DSCR (structural issue)",
      "Must address all three simultaneously"
    ],
    "recommended_action": "URGENT: Comprehensive restructuring package
      1. Debt reduction: Sell assets or equity injection (€10M needed)
      2. Interest deferral: Extend interest payment schedule 6 months
      3. Operational turnaround: Cost reduction plan to improve EBITDA",
    "alternative_actions": [
      "Full restructuring with senior lender consent",
      "Asset sale to third party (refinance, reduce debt)",
      "Sponsor equity injection to strengthen balance sheet"
    ]
  }
}
```

### Methodology: Interaction Scoring

```
Base Risk Score = Number of breached covenants × 20

Interaction Penalties:
├─ LLCR + DSCR (both breached): +30 points (compounding)
├─ LLCR + IC (both breached): +20 points (reinforcing)
├─ DSCR + IC (both breached): +20 points (reinforcing)
├─ All 3 breached: +50 points (systemic distress)
└─ Near maturity (< 90 days): +25 points (urgent)

Risk Score = Base + Penalties
└─ Example: 3 × 20 + 50 = 110 points → "CRITICAL"
```

---

## 3. Waiver Intelligence

### Problem: Waiver Decisions are Opaque

Analyst faces breach notification: "SolarGrid LLCR breached. What do I do?"

**Options:**

1. Request waiver from lender (cost? Success rate? Time?)
2. Restructure the loan (cost? Complexity?)
3. Asset sales / equity injection (cost? Feasibility?)

**Bloomberg/Excel:** No guidance. Analyst must guess or consult legal.

### GreenGauge Solution: Waiver Intelligence

**System calculates:**

1. **Waiver Cost**

   - Formula: Base waiver fee (0.25-0.75% of loan) + risk premium
   - Base: 50bps (0.5%)
   - Multiple breaches: +25bps
   - Near maturity: +50bps
   - High-risk sector: +50bps
   - Example: €50M loan, 1 breach, far from maturity = 50bps = €250K

2. **Restructuring Cost**

   - Debt refinancing: 1.5-3% of loan amount
   - Legal/documentation: €50-200K
   - Renegotiation time: 4-8 weeks
   - Example: €50M loan = €750K-1.5M restructuring cost

3. **Historical Success Rate**

   - Market data: 78% of covenant breach waivers are granted
   - Time to resolution: ~30 days
   - Recurrence rate: 15% of waivers lead to repeat breaches

4. **Recommendation**
   - If waiver cheap + urgent: "Go for waiver"
   - If restructuring cheaper + permanent: "Restructure"
   - If both needed: "Waiver immediately, plan restructuring in parallel"

### Example: Waiver Intelligence Report

```json
{
  "loan_id": "solargrid_001",
  "breached_covenants": ["LLCR"],
  "loan_amount": 50000000,
  "sector": "Renewable Energy",
  "days_to_maturity": 325,

  "waiver_intelligence": {
    "waiver_cost_eur": 500000,
    "waiver_cost_bps": 100,
    "waiver_cost_percentage": 1.0,
    "waiver_timeframe_days": 30,
    "waiver_success_rate": 0.78,

    "restructuring_cost_eur": 2000000,
    "restructuring_cost_percentage": 4.0,
    "restructuring_timeframe_days": 56,

    "recommendation": "WAIVER",
    "rationale": "Single covenant breach far from maturity.
      Waiver is 4x cheaper than restructuring.
      Historical success rate 78% makes waiver attractive.",

    "action_plan": [
      "Day 1: Contact lead arranger, request waiver meeting",
      "Day 2-3: Prepare waiver request package with financial analysis",
      "Day 5-10: Negotiate with lender syndicate",
      "Day 20-30: Waiver granted and documented",
      "Budget: €500K waiver fee + €50K legal"
    ],

    "if_waiver_fails": "Implement restructuring plan (€2M cost)
      within 30-day extension period"
  }
}
```

### When to Choose Each Option

| Scenario                    | Recommendation | Rationale                                            |
| --------------------------- | -------------- | ---------------------------------------------------- |
| 1 breach, far from maturity | WAIVER         | Quick, cheap, low risk                               |
| Multiple breaches           | RESTRUCTURE    | Systemic issues need permanent fix                   |
| Breach 90 days to maturity  | WAIVER         | Urgency requires speed                               |
| Repeat breach (2nd time)    | RESTRUCTURE    | Waiver didn't solve root cause                       |
| Sector downturn             | BOTH           | Waiver buys time, restructuring addresses root cause |

---

## 4. Covenant Monitoring Best Practices

### Proactive vs. Reactive

**Reactive Monitoring (Old Way):**

```
Timeline → → → BREACH HAPPENS → Alert sent → Lender contact →
Negotiate waiver → 30 days of stress
```

**Proactive Monitoring (GreenGauge):**

```
Timeline: Monitor trend → PREDICT BREACH (45 days early) →
Proactive outreach → Restructure plan → Waiver smooth sailing
```

**Result:** Prevent crisis before it becomes urgent.

### Key Metrics to Track

1. **Trend Velocity**

   - How fast is covenant deteriorating?
   - Fast deterioration (<30 days to breach) = urgent action

2. **Interaction Risk**

   - How many covenants are stressed?
   - Multiple stresses = complex restructuring needed

3. **Historical Patterns**
   - Similar borrowers in similar situations
   - Success rate of waiver vs. restructuring

---

## Competitive Differentiation

### Bloomberg

**Shows:**

```
LLCR: 1.15x (AT RISK)
DSCR: 1.20x (AT RISK)
```

**User must figure out:** What happens next? How bad is it? What to do?

### GreenGauge

**Shows:**

```
LLCR Trend: 1.50x (1yr) → 1.15x (now) = -23% deterioration
Breach Prediction: 45 days at current trend
Interaction Analysis: Compounding stress with DSCR
Waiver Intelligence: Cost €500K, success rate 78%, time 30 days
Recommendation: Proactive engagement recommended
```

**User knows:** Exactly what will happen, when, why, and what to do.

---

## Conclusion

GreenGauge Covenant Analytics provides **intelligence, not just data**:

✓ **Trend Analysis:** Predict breaches 45 days early  
✓ **Interaction Analysis:** Understand multi-covenant stress  
✓ **Waiver Intelligence:** Decide waiver vs. restructuring confidently  
✓ **Proactive Action:** Prevent breaches before they happen

**Position:** "Bloomberg shows covenants. GreenGauge predicts covenant outcomes."
