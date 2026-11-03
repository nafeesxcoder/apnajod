CREATE TABLE IF NOT EXISTS chat_messages (
  id VARCHAR(64) NOT NULL,
  conversation_id VARCHAR(160) NOT NULL,
  sender_id CHAR(36) NOT NULL,
  message_type VARCHAR(20) NOT NULL,
  payload JSON NOT NULL,
  status ENUM('sent','delivered','read') NOT NULL DEFAULT 'sent',
  created_at_ms BIGINT NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id, conversation_id),
  CONSTRAINT fk_chatmsg_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_chatmsg_conversation (conversation_id, created_at_ms)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS date_proposals (
  id CHAR(36) PRIMARY KEY,
  conversation_id VARCHAR(160) NOT NULL,
  proposer_id CHAR(36) NOT NULL,
  status ENUM('proposed','accepted','declined','cancelled') NOT NULL DEFAULT 'proposed',
  venue VARCHAR(160),
  category VARCHAR(80),
  area VARCHAR(160),
  time_label VARCHAR(80),
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_dateprop_proposer FOREIGN KEY (proposer_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_dateprop_conversation (conversation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS live_locations (
  id CHAR(36) PRIMARY KEY,
  conversation_id VARCHAR(160) NOT NULL,
  sharer_id CHAR(36) NOT NULL,
  client_action_id VARCHAR(120) NOT NULL,
  latitude DOUBLE NOT NULL,
  longitude DOUBLE NOT NULL,
  label VARCHAR(160),
  expires_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_livelocation_sharer FOREIGN KEY (sharer_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_livelocation_action (sharer_id, client_action_id),
  INDEX idx_livelocation_conversation (conversation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;