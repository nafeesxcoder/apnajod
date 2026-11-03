CREATE TABLE IF NOT EXISTS calls (
  id CHAR(36) PRIMARY KEY,
  conversation_id VARCHAR(160) NOT NULL,
  caller_id CHAR(36) NOT NULL,
  callee_id CHAR(36) NOT NULL,
  mode ENUM('audio','video') NOT NULL DEFAULT 'audio',
  status ENUM('ringing','accepted','declined','missed','ended') NOT NULL DEFAULT 'ringing',
  started_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  ended_at DATETIME(6) NULL,
  ended_reason VARCHAR(40) NULL,
  INDEX idx_calls_callee (callee_id, status),
  INDEX idx_calls_caller (caller_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS call_signals (
  id CHAR(36) PRIMARY KEY,
  call_id CHAR(36) NOT NULL,
  sender_id CHAR(36) NOT NULL,
  type VARCHAR(20) NOT NULL,
  payload JSON NOT NULL,
  created_at_ms BIGINT NOT NULL,
  CONSTRAINT fk_signal_call FOREIGN KEY (call_id) REFERENCES calls(id) ON DELETE CASCADE,
  INDEX idx_signals_call (call_id, created_at_ms)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;