-- Couple connection requests (real backend-persisted invites, replacing the local-only preview stub)
CREATE TABLE IF NOT EXISTS couple_requests (
  id CHAR(36) PRIMARY KEY,
  requester_id CHAR(36) NOT NULL,
  target_id CHAR(36) NOT NULL,
  status ENUM('pending','accepted','declined','cancelled','expired') NOT NULL DEFAULT 'pending',
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  expires_at DATETIME(6) NOT NULL,
  CONSTRAINT fk_couplereq_requester FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_couplereq_target FOREIGN KEY (target_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_couplereq_requester (requester_id),
  INDEX idx_couplereq_target (target_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;