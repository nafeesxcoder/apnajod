-- Ludo for 2 to 4 players, with live voice.
-- A game is a room: the host picks how many can play and invites people
-- they can already chat with. The whole board is kept as JSON in state.
-- The dice are rolled here, on the server.
-- ludo_members says who is invited, who joined and who left.
CREATE TABLE IF NOT EXISTS ludo_games (
  id CHAR(36) NOT NULL PRIMARY KEY,
  host_id CHAR(36) NOT NULL,
  max_players TINYINT UNSIGNED NOT NULL,
  status ENUM('waiting','playing','finished','cancelled') NOT NULL DEFAULT 'waiting',
  state JSON NULL,
  turn_deadline DATETIME NULL,
  version INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY ludo_status (status, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ludo_members (
  game_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  status ENUM('invited','joined','left','declined') NOT NULL DEFAULT 'invited',
  invited_by CHAR(36) NULL,
  joined_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (game_id, user_id),
  KEY ludo_member_user (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
