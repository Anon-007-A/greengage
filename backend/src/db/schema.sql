-- GreenGauge Database Schema (PostgreSQL)
-- Optimized for 100,000+ loans with proper indexing
-- Created: January 10, 2026

-- ============================================
-- CORE TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borrower_id UUID NOT NULL,
  borrower_name VARCHAR(255) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  maturity_date DATE NOT NULL,
  sector VARCHAR(100),
  covenant_status VARCHAR(20) DEFAULT 'SAFE', -- SAFE, AT_RISK, BREACHED
  green_score INT DEFAULT 0, -- 0-100
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT loans_amount_positive CHECK (amount > 0)
);

CREATE TABLE IF NOT EXISTS covenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- LLCR, DSCR, Interest_Coverage, Debt_to_Equity
  current_value DECIMAL(10, 4) NOT NULL,
  threshold DECIMAL(10, 4) NOT NULL,
  cushion_pct DECIMAL(5, 2), -- Current cushion as % of threshold
  status VARCHAR(20) DEFAULT 'SAFE', -- SAFE, AT_RISK, BREACHED
  last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_status CHECK (status IN ('SAFE', 'AT_RISK', 'BREACHED'))
);

CREATE TABLE IF NOT EXISTS covenant_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  covenant_id UUID NOT NULL REFERENCES covenants(id) ON DELETE CASCADE,
  value DECIMAL(10, 4) NOT NULL,
  recorded_at DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS esg_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  overall_score INT NOT NULL, -- 0-100
  green_classification VARCHAR(20), -- Dark_Green, Light_Green, Transition, Brown
  eu_taxonomy_aligned BOOLEAN DEFAULT FALSE,
  eu_taxonomy_alignment_pct INT DEFAULT 0, -- 0-100
  co2_reduction_tonnes DECIMAL(15, 2), -- Annual CO2 reduction
  renewable_energy_mwh DECIMAL(15, 2), -- Annual MWh
  water_saved_m3 DECIMAL(15, 2), -- Annual water savings
  green_bond_eligible BOOLEAN DEFAULT FALSE,
  green_bond_eligible_amount DECIMAL(15, 2),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS breach_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  probability DECIMAL(4, 3) NOT NULL, -- 0.000 to 1.000
  confidence DECIMAL(4, 3) NOT NULL, -- Model confidence 0.000 to 1.000
  predicted_breach_date DATE,
  top_risk_driver_1 VARCHAR(100),
  top_risk_driver_1_weight DECIMAL(5, 3),
  top_risk_driver_2 VARCHAR(100),
  top_risk_driver_2_weight DECIMAL(5, 3),
  top_risk_driver_3 VARCHAR(100),
  top_risk_driver_3_weight DECIMAL(5, 3),
  model_version VARCHAR(10) DEFAULT '1.2.1',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_probability CHECK (probability >= 0 AND probability <= 1),
  CONSTRAINT valid_confidence CHECK (confidence >= 0 AND confidence <= 1)
);

CREATE TABLE IF NOT EXISTS regulatory_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type VARCHAR(50) NOT NULL, -- CSRD, TCFD, EU_TAXONOMY, GREEN_BOND
  portfolio_id UUID, -- For multi-portfolio support
  double_materiality_assessed BOOLEAN DEFAULT FALSE,
  tcfd_disclosure_complete BOOLEAN DEFAULT FALSE,
  eu_taxonomy_classified BOOLEAN DEFAULT FALSE,
  green_bond_framework_ready BOOLEAN DEFAULT FALSE,
  compliance_percentage INT DEFAULT 0, -- 0-100
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PERFORMANCE INDEXES
-- ============================================

-- Loans table indexes
CREATE INDEX idx_loans_borrower_id ON loans(borrower_id);
CREATE INDEX idx_loans_maturity_date ON loans(maturity_date);
CREATE INDEX idx_loans_covenant_status ON loans(covenant_status);
CREATE INDEX idx_loans_green_score ON loans(green_score DESC);
CREATE INDEX idx_loans_sector ON loans(sector);
CREATE INDEX idx_loans_created_at ON loans(created_at DESC);

-- Composite index for risk dashboard queries
CREATE INDEX idx_loans_status_created ON loans(covenant_status, created_at DESC);

-- Covenants table indexes
CREATE INDEX idx_covenants_loan_id ON covenants(loan_id);
CREATE INDEX idx_covenants_status ON covenants(status);
CREATE INDEX idx_covenants_type ON covenants(type);
CREATE INDEX idx_covenants_cushion ON covenants(cushion_pct);

-- Composite index for at-risk filtering
CREATE INDEX idx_covenants_status_cushion ON covenants(status, cushion_pct);

-- Covenant history indexes (for trend analysis)
CREATE INDEX idx_covenant_history_covenant_id ON covenant_history(covenant_id);
CREATE INDEX idx_covenant_history_recorded_at ON covenant_history(recorded_at DESC);
CREATE INDEX idx_covenant_history_lookup ON covenant_history(covenant_id, recorded_at DESC);

-- ESG scores indexes
CREATE INDEX idx_esg_scores_loan_id ON esg_scores(loan_id);
CREATE INDEX idx_esg_scores_classification ON esg_scores(green_classification);
CREATE INDEX idx_esg_scores_eu_aligned ON esg_scores(eu_taxonomy_aligned);
CREATE INDEX idx_esg_scores_green_bond ON esg_scores(green_bond_eligible);
CREATE INDEX idx_esg_scores_overall_score ON esg_scores(overall_score DESC);

-- Breach predictions indexes
CREATE INDEX idx_breach_predictions_loan_id ON breach_predictions(loan_id);
CREATE INDEX idx_breach_predictions_probability ON breach_predictions(probability DESC);
CREATE INDEX idx_breach_predictions_date ON breach_predictions(predicted_breach_date);
CREATE INDEX idx_breach_predictions_model_version ON breach_predictions(model_version);

-- Regulatory compliance indexes
CREATE INDEX idx_regulatory_compliance_report_type ON regulatory_compliance(report_type);
CREATE INDEX idx_regulatory_compliance_updated ON regulatory_compliance(last_updated DESC);

-- ============================================
-- MATERIALIZED VIEWS FOR PERFORMANCE
-- ============================================

-- Portfolio summary (refreshed hourly)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_portfolio_summary AS
SELECT
  COUNT(*) AS total_loans,
  SUM(amount) AS total_amount,
  COUNT(CASE WHEN covenant_status = 'BREACHED' THEN 1 END) AS breached_count,
  COUNT(CASE WHEN covenant_status = 'AT_RISK' THEN 1 END) AS at_risk_count,
  AVG(green_score) AS avg_green_score,
  NOW() AS last_refreshed
FROM loans;

CREATE INDEX idx_mv_portfolio_summary_refreshed ON mv_portfolio_summary(last_refreshed);

-- Risk distribution (refreshed hourly)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_risk_distribution AS
SELECT
  covenant_status,
  COUNT(*) AS loan_count,
  SUM(l.amount) AS total_amount,
  AVG(l.green_score) AS avg_green_score
FROM covenants c
JOIN loans l ON c.loan_id = l.id
GROUP BY covenant_status;

-- Green financing summary (refreshed hourly)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_green_financing_summary AS
SELECT
  green_classification,
  COUNT(*) AS loan_count,
  SUM(COALESCE(green_bond_eligible_amount, 0)) AS green_bond_potential,
  SUM(co2_reduction_tonnes) AS total_co2_reduction,
  SUM(renewable_energy_mwh) AS total_renewable_mwh
FROM esg_scores
GROUP BY green_classification;

-- ============================================
-- FUNCTIONS FOR COMMON QUERIES
-- ============================================

-- Function to get at-risk loans efficiently
CREATE OR REPLACE FUNCTION get_at_risk_loans(limit_count INT DEFAULT 20, offset_count INT DEFAULT 0)
RETURNS TABLE(
  loan_id UUID,
  borrower_name VARCHAR(255),
  amount DECIMAL(15, 2),
  covenant_status VARCHAR(20),
  covenant_count INT,
  breached_covenants INT,
  breach_probability DECIMAL(4, 3)
) AS $$
SELECT
  l.id,
  l.borrower_name,
  l.amount,
  l.covenant_status,
  COUNT(c.id)::INT,
  COUNT(CASE WHEN c.status = 'BREACHED' THEN 1 END)::INT,
  bp.probability
FROM loans l
LEFT JOIN covenants c ON l.id = c.loan_id
LEFT JOIN breach_predictions bp ON l.id = bp.loan_id
WHERE l.covenant_status IN ('AT_RISK', 'BREACHED')
GROUP BY l.id, l.borrower_name, l.amount, l.covenant_status, bp.probability
ORDER BY bp.probability DESC, l.covenant_status DESC
LIMIT limit_count OFFSET offset_count;
$$ LANGUAGE SQL;

-- Function to calculate portfolio risk score
CREATE OR REPLACE FUNCTION calculate_portfolio_risk_score()
RETURNS DECIMAL AS $$
SELECT
  (
    (COUNT(CASE WHEN covenant_status = 'BREACHED' THEN 1 END) * 100.0 / COUNT(*)) +
    (COUNT(CASE WHEN covenant_status = 'AT_RISK' THEN 1 END) * 50.0 / COUNT(*)) +
    (AVG(COALESCE((SELECT AVG(probability) FROM breach_predictions), 0)) * 50)
  ) / 3
FROM loans;
$$ LANGUAGE SQL;

-- ============================================
-- SAMPLE DATA STATISTICS
-- ============================================

-- Query: Get statistics for query optimization planning
-- SELECT * FROM pg_stat_user_tables WHERE schemaname = 'public';
-- SELECT * FROM pg_stat_user_indexes WHERE schemaname = 'public';

-- ============================================
-- MAINTENANCE JOBS (Run on schedule)
-- ============================================

-- Refresh materialized views every hour
-- SELECT REFRESH MATERIALIZED VIEW CONCURRENTLY mv_portfolio_summary;
-- SELECT REFRESH MATERIALIZED VIEW CONCURRENTLY mv_risk_distribution;
-- SELECT REFRESH MATERIALIZED VIEW CONCURRENTLY mv_green_financing_summary;

-- Analyze tables for query planner (weekly)
-- ANALYZE loans, covenants, esg_scores, breach_predictions;

-- Vacuum (weekly)
-- VACUUM ANALYZE loans, covenants, esg_scores, breach_predictions;
