CREATE TABLE IF NOT EXISTS monthly_pnl (id SERIAL PRIMARY KEY, valuation_date DATE NOT NULL, year_month VARCHAR(7) NOT NULL, unrealized_pnl NUMERIC(15,2) NOT NULL, reversal_pnl NUMERIC(15,2), net_pnl NUMERIC(15,2) NOT NULL, position_count INTEGER, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE(year_month, valuation_date));

CREATE TABLE IF NOT EXISTS daily_pnl (id SERIAL PRIMARY KEY, valuation_date DATE NOT NULL UNIQUE, realized_pnl NUMERIC(15,2) DEFAULT 0, unrealized_pnl NUMERIC(15,2) NOT NULL, total_pnl NUMERIC(15,2) NOT NULL, position_count INTEGER, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

CREATE INDEX IF NOT EXISTS idx_monthly_pnl_year_month ON monthly_pnl(year_month);

CREATE INDEX IF NOT EXISTS idx_monthly_pnl_valuation_date ON monthly_pnl(valuation_date);

CREATE INDEX IF NOT EXISTS idx_daily_pnl_valuation_date ON daily_pnl(valuation_date);

