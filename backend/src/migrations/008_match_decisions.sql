CREATE TABLE IF NOT EXISTS match_decisions (
  id CHAR(36) PRIMARY KEY,
  actor_id CHAR(36) NOT NULL,
  target_id CHAR(36) NOT NULL,
  decision ENUM('interested','pass') NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_decision_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_decision_target FOREIGN KEY (target_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_decision_pair (actor_id, target_id),
  INDEX idx_decision_actor (actor_id),
  INDEX idx_decision_target (target_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mutual_matches (
  id CHAR(36) PRIMARY KEY,
  user_a_id CHAR(36) NOT NULL,
  user_b_id CHAR(36) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_mutual_a FOREIGN KEY (user_a_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_mutual_b FOREIGN KEY (user_b_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_mutual_pair (user_a_id, user_b_id),
  INDEX idx_mutual_a (user_a_id),
  INDEX idx_mutual_b (user_b_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;