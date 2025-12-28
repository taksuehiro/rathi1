-- Trades table
CREATE TABLE IF NOT EXISTS trades (
    id SERIAL PRIMARY KEY,
    trade_date DATE NOT NULL,
    contract_month VARCHAR(10) NOT NULL,
    buy_sell VARCHAR(4) NOT NULL CHECK (buy_sell IN ('BUY', 'SELL')),
    quantity_mt NUMERIC(10,2) NOT NULL,
    price_usd NUMERIC(10,2) NOT NULL,
    counterparty VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Deliveries table
CREATE TABLE IF NOT EXISTS deliveries (
    id SERIAL PRIMARY KEY,
    delivery_date DATE NOT NULL,
    contract_month VARCHAR(10) NOT NULL,
    quantity_mt NUMERIC(10,2) NOT NULL,
    warehouse VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Position components table
CREATE TABLE IF NOT EXISTS position_components (
    id SERIAL PRIMARY KEY,
    as_of_date DATE NOT NULL,
    period_type VARCHAR(1) NOT NULL CHECK (period_type IN ('M', 'D')),
    scope VARCHAR(20) NOT NULL DEFAULT 'TOTAL',
    component_code VARCHAR(50) NOT NULL,
    qty_mt NUMERIC(10,2),
    amount_usd NUMERIC(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(as_of_date, scope, component_code)
);

-- Valuations table
CREATE TABLE IF NOT EXISTS valuations (
    id SERIAL PRIMARY KEY,
    as_of_date DATE NOT NULL,
    period_type VARCHAR(1) NOT NULL CHECK (period_type IN ('M', 'D')),
    scope VARCHAR(20) NOT NULL DEFAULT 'TOTAL',
    position_qty_mt NUMERIC(10,2) NOT NULL,
    ref_tenor_months INTEGER NOT NULL,
    futures_price_usd NUMERIC(10,2) NOT NULL,
    mtm_value_usd NUMERIC(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(as_of_date, scope)
);

-- Futures curve table
CREATE TABLE IF NOT EXISTS futures_curve (
    id SERIAL PRIMARY KEY,
    as_of_date DATE NOT NULL,
    tenor_months INTEGER NOT NULL,
    futures_price_usd NUMERIC(10,2) NOT NULL,
    price_source VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(as_of_date, tenor_months)
);





