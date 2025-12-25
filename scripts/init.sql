-- AI-Rathispherd データベーススキーマ

-- 拡張機能
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. trades（取引発生）
CREATE TABLE trades (
    trade_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    period_type char(1) NOT NULL CHECK (period_type IN ('M', 'D')),
    period_date date NOT NULL,
    buy_sell char(1) NOT NULL CHECK (buy_sell IN ('B', 'S')),
    instrument_type text NOT NULL,
    tenor_months smallint NULL CHECK (tenor_months >= 0 AND tenor_months <= 6),
    quantity_mt numeric(18,6) NOT NULL,
    trade_price_usd numeric(18,6) NOT NULL,
    trade_amount_usd numeric(18,2) NULL,
    notes text NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_trades_period ON trades(period_date, period_type);
CREATE INDEX idx_trades_instrument ON trades(instrument_type, tenor_months);

-- 2. deliveries（計上/デリバリー）
CREATE TABLE deliveries (
    delivery_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    linked_trade_id uuid NULL REFERENCES trades(trade_id),
    period_type char(1) NOT NULL CHECK (period_type IN ('M', 'D')),
    period_date date NOT NULL,
    delivered_quantity_mt numeric(18,6) NOT NULL,
    booking_amount_usd numeric(18,2) NOT NULL,
    status text NULL,
    notes text NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_deliveries_period ON deliveries(period_date, period_type);
CREATE INDEX idx_deliveries_linked_trade ON deliveries(linked_trade_id);

-- 3. futures_curve（先物カーブ：0〜6M）
CREATE TABLE futures_curve (
    as_of_date date NOT NULL,
    tenor_months smallint NOT NULL CHECK (tenor_months >= 0 AND tenor_months <= 6),
    futures_price_usd numeric(18,6) NOT NULL,
    price_source text NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (as_of_date, tenor_months)
);

-- 4. valuations（評価）
CREATE TABLE valuations (
    as_of_date date NOT NULL,
    period_type char(1) NOT NULL CHECK (period_type IN ('M', 'D')),
    scope text NOT NULL DEFAULT 'TOTAL',
    position_qty_mt numeric(18,6) NOT NULL,
    ref_tenor_months smallint NULL,
    futures_price_usd numeric(18,6) NULL,
    published_premium_usd numeric(18,6) NULL,
    physical_price_usd numeric(18,6) NULL,
    mtm_value_usd numeric(18,2) NOT NULL,
    notes text NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (as_of_date, scope)
);

-- 5. position_components（計算済みポジション内訳）
CREATE TABLE position_components (
    as_of_date date NOT NULL,
    period_type char(1) NOT NULL CHECK (period_type IN ('M', 'D')),
    scope text NOT NULL DEFAULT 'TOTAL',
    component_code text NOT NULL,
    qty_mt numeric(18,6) NULL,
    amount_usd numeric(18,2) NULL,
    notes text NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (as_of_date, scope, component_code)
);

-- インデックス追加
CREATE INDEX idx_valuations_as_of ON valuations(as_of_date, period_type);
CREATE INDEX idx_position_components_as_of ON position_components(as_of_date, period_type, scope);

-- コメント
COMMENT ON TABLE trades IS '取引発生（日次/月次のフロー）';
COMMENT ON TABLE deliveries IS '計上/デリバリー（取引日とズレる前提）';
COMMENT ON TABLE futures_curve IS '先物カーブ（as_of時点の0〜6か月先まで）';
COMMENT ON TABLE valuations IS '評価スナップショット（MVPは先物参照のみ）';
COMMENT ON TABLE position_components IS '計算済みポジション内訳（ダッシュボード用）';


