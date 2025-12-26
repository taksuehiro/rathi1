-- ポジションリミット管理機能
-- 作成日: 2025-12-27

-- ポジションリミットテーブル
CREATE TABLE IF NOT EXISTS position_limits (
  id SERIAL PRIMARY KEY,
  limit_type VARCHAR(50) NOT NULL, -- 'net_position', 'customer_exposure', 'contract_month'
  entity_id VARCHAR(100), -- 顧客ID、契約月(e.g., '2026-M03')、NULL=全体
  limit_value NUMERIC(12,2) NOT NULL, -- トン数
  warning_threshold NUMERIC(5,2) DEFAULT 80.0, -- パーセント (80%で警告)
  alert_threshold NUMERIC(5,2) DEFAULT 95.0, -- パーセント (95%でアラート)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- リミット違反履歴テーブル
CREATE TABLE IF NOT EXISTS limit_violations (
  id SERIAL PRIMARY KEY,
  limit_id INTEGER REFERENCES position_limits(id),
  violation_date DATE NOT NULL,
  actual_value NUMERIC(12,2),
  limit_value NUMERIC(12,2),
  exceeded_by NUMERIC(12,2),
  severity VARCHAR(20), -- 'warning', 'alert', 'breach'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_position_limits_type ON position_limits(limit_type);
CREATE INDEX IF NOT EXISTS idx_position_limits_entity ON position_limits(entity_id);
CREATE INDEX IF NOT EXISTS idx_limit_violations_date ON limit_violations(violation_date);
CREATE INDEX IF NOT EXISTS idx_limit_violations_severity ON limit_violations(severity);

-- 初期リミット設定（例）
INSERT INTO position_limits (limit_type, entity_id, limit_value, warning_threshold, alert_threshold) VALUES
  ('net_position', NULL, 1000, 80, 95), -- 全体ネットポジション上限1000トン
  ('customer_exposure', 'CUST001', 300, 75, 90), -- Toyota Motor 上限300トン
  ('customer_exposure', 'CUST002', 200, 75, 90), -- Honda 上限200トン
  ('customer_exposure', 'CUST003', 250, 75, 90), -- Nissan 上限250トン
  ('contract_month', '2026-M03', 500, 80, 95), -- 2026年3月限 上限500トン
  ('contract_month', '2026-M06', 400, 80, 95), -- 2026年6月限 上限400トン
  ('contract_month', '2026-M09', 300, 80, 95); -- 2026年9月限 上限300トン

-- リミットチェック用ビュー
-- 注意: VIEWの作成は後回し（別のマイグレーションで実行）
-- 理由: 同じトランザクション内でテーブル作成直後にVIEWを作成すると、
--       position_limitsテーブルが参照できない場合があるため
-- 
-- CREATE OR REPLACE VIEW position_limit_status AS
-- SELECT 
--   pl.id,
--   pl.limit_type,
--   pl.entity_id,
--   pl.limit_value,
--   pl.warning_threshold,
--   pl.alert_threshold,
--   CASE 
--     WHEN pl.limit_type = 'net_position' THEN (
--       SELECT COALESCE(SUM(qty_mt), 0) FROM position_components WHERE as_of_date = CURRENT_DATE
--     )
--     WHEN pl.limit_type = 'customer_exposure' THEN (
--       SELECT COALESCE(SUM(quantity_mt), 0) FROM trades WHERE counterparty = pl.entity_id
--     )
--     WHEN pl.limit_type = 'contract_month' THEN (
--       SELECT COALESCE(SUM(quantity_mt), 0) FROM trades 
--       WHERE contract_month = pl.entity_id
--     )
--   END as current_value,
--   CASE 
--     WHEN pl.limit_type = 'net_position' THEN (
--       SELECT COALESCE(SUM(qty_mt), 0) FROM position_components WHERE as_of_date = CURRENT_DATE
--     ) / pl.limit_value * 100
--     WHEN pl.limit_type = 'customer_exposure' THEN (
--       SELECT COALESCE(SUM(quantity_mt), 0) FROM trades WHERE counterparty = pl.entity_id
--     ) / pl.limit_value * 100
--     WHEN pl.limit_type = 'contract_month' THEN (
--       SELECT COALESCE(SUM(quantity_mt), 0) FROM trades 
--       WHERE contract_month = pl.entity_id
--     ) / pl.limit_value * 100
--   END as utilization_pct,
--   CASE
--     WHEN (
--       CASE 
--         WHEN pl.limit_type = 'net_position' THEN (
--           SELECT COALESCE(SUM(qty_mt), 0) FROM position_components WHERE as_of_date = CURRENT_DATE
--         )
--         WHEN pl.limit_type = 'customer_exposure' THEN (
--           SELECT COALESCE(SUM(quantity_mt), 0) FROM trades WHERE counterparty = pl.entity_id
--         )
--         WHEN pl.limit_type = 'contract_month' THEN (
--           SELECT COALESCE(SUM(quantity_mt), 0) FROM trades 
--           WHERE contract_month = pl.entity_id
--         )
--       END
--     ) / pl.limit_value * 100 >= pl.alert_threshold THEN 'alert'
--     WHEN (
--       CASE 
--         WHEN pl.limit_type = 'net_position' THEN (
--           SELECT COALESCE(SUM(qty_mt), 0) FROM position_components WHERE as_of_date = CURRENT_DATE
--         )
--         WHEN pl.limit_type = 'customer_exposure' THEN (
--           SELECT COALESCE(SUM(quantity_mt), 0) FROM trades WHERE counterparty = pl.entity_id
--         )
--         WHEN pl.limit_type = 'contract_month' THEN (
--           SELECT COALESCE(SUM(quantity_mt), 0) FROM trades 
--           WHERE contract_month = pl.entity_id
--         )
--       END
--     ) / pl.limit_value * 100 >= pl.warning_threshold THEN 'warning'
--     ELSE 'normal'
--   END as status
-- FROM position_limits pl
-- WHERE pl.is_active = true;

