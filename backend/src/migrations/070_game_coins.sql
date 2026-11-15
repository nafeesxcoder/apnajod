-- Coins for games: earned by playing Ludo and from the daily spinner,
-- spent on looks for Ludo (boards, sounds, dice, tokens, emoji and quick
-- chat) or swapped for a Spark or a Super Like. Coins are only ever earned
-- in the app - they are never bought or paid out.
--
-- coin_ledger is every coin in or out. Its unique key on (user, reason,
-- ref) means one game or one day can pay out only once. Re-runs on every
-- deploy (CREATE TABLE IF NOT EXISTS).
CREATE TABLE IF NOT EXISTS game_wallets (
  user_id CHAR(36) NOT NULL PRIMARY KEY,
  coins INT NOT NULL DEFAULT 0,
  xp INT NOT NULL DEFAULT 0,
  wins INT NOT NULL DEFAULT 0,
  games INT NOT NULL DEFAULT 0,
  streak INT NOT NULL DEFAULT 0,
  best_streak INT NOT NULL DEFAULT 0,
  spin_at DATETIME(6) NULL,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_game_wallet_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS coin_ledger (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  amount INT NOT NULL,
  reason VARCHAR(30) NOT NULL,
  ref VARCHAR(64) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY uniq_coin_ref (user_id, reason, ref),
  INDEX idx_coin_user_time (user_id, created_at),
  CONSTRAINT fk_coin_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS game_unlocks (
  user_id CHAR(36) NOT NULL,
  item_key VARCHAR(40) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (user_id, item_key),
  CONSTRAINT fk_game_unlock_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
