CREATE TABLE IF NOT EXISTS position_limits (id SERIAL PRIMARY KEY, limit_type VARCHAR(50) NOT NULL, entity_id VARCHAR(100), limit_value NUMERIC(12,2) NOT NULL, warning_threshold NUMERIC(5,2) DEFAULT 80.0, alert_threshold NUMERIC(5,2) DEFAULT 95.0, is_active BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

CREATE TABLE IF NOT EXISTS limit_violations (id SERIAL PRIMARY KEY, limit_id INTEGER REFERENCES position_limits(id), violation_date DATE NOT NULL, actual_value NUMERIC(12,2), limit_value NUMERIC(12,2), exceeded_by NUMERIC(12,2), severity VARCHAR(20), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

CREATE INDEX IF NOT EXISTS idx_position_limits_type ON position_limits(limit_type);

CREATE INDEX IF NOT EXISTS idx_position_limits_entity ON position_limits(entity_id);

CREATE INDEX IF NOT EXISTS idx_limit_violations_date ON limit_violations(violation_date);

CREATE INDEX IF NOT EXISTS idx_limit_violations_severity ON limit_violations(severity);

INSERT INTO position_limits (limit_type, entity_id, limit_value, warning_threshold, alert_threshold) VALUES ('net_position', NULL, 1000, 80, 95);

INSERT INTO position_limits (limit_type, entity_id, limit_value, warning_threshold, alert_threshold) VALUES ('customer_exposure', 'CUST001', 300, 75, 90);

INSERT INTO position_limits (limit_type, entity_id, limit_value, warning_threshold, alert_threshold) VALUES ('customer_exposure', 'CUST002', 200, 75, 90);

INSERT INTO position_limits (limit_type, entity_id, limit_value, warning_threshold, alert_threshold) VALUES ('customer_exposure', 'CUST003', 250, 75, 90);

INSERT INTO position_limits (limit_type, entity_id, limit_value, warning_threshold, alert_threshold) VALUES ('contract_month', '2026-M03', 500, 80, 95);

INSERT INTO position_limits (limit_type, entity_id, limit_value, warning_threshold, alert_threshold) VALUES ('contract_month', '2026-M06', 400, 80, 95);

INSERT INTO position_limits (limit_type, entity_id, limit_value, warning_threshold, alert_threshold) VALUES ('contract_month', '2026-M09', 300, 80, 95);
