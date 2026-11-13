-- Notifications for the phone app: each phone's Expo push token.
--
-- The website keeps using push_subscriptions (web push). A token goes with
-- the member's account, is removed on sign-out, and is deleted by the server
-- when Expo says the phone no longer has the app. Re-runs on every deploy.
CREATE TABLE IF NOT EXISTS device_push_tokens (
  token VARCHAR(255) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  platform VARCHAR(16) NOT NULL DEFAULT 'android',
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  INDEX idx_device_push_user (user_id),
  CONSTRAINT fk_device_push_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
