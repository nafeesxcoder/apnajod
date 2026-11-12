-- Chat games: This or That, Would you rather, How well do you know me,
-- Tic-tac-toe.
--
-- One row per game. `state` holds the board or the answers. Hidden answers
-- live here, never in a chat message, so neither player can peek before
-- the reveal. `version` goes up on every move, and a move is only saved
-- against the version it was made on, so two taps at once cannot both land.
-- Games are for fun only - nothing is bet or won.
--
-- Re-runs on every deploy. CREATE TABLE IF NOT EXISTS is safe the second time.

CREATE TABLE IF NOT EXISTS chat_games (
  id              CHAR(36)     NOT NULL PRIMARY KEY,
  conversation_id VARCHAR(160) NOT NULL,
  kind            VARCHAR(30)  NOT NULL,
  created_by      CHAR(36)     NOT NULL,
  players         JSON         NOT NULL,
  state           JSON         NOT NULL,
  status          ENUM('active','done') NOT NULL DEFAULT 'active',
  version         INT          NOT NULL DEFAULT 0,
  created_at      DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at      DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_chat_game_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE CASCADE,
  INDEX idx_chat_game_conversation (conversation_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
