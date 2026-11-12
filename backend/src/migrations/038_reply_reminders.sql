-- "Your turn" reply reminders.
--
-- When someone sends a message and the other person has not replied for a
-- few hours, the other person gets one gentle push. One row per message
-- reminded about, so the same message never triggers a second push - the
-- primary key refuses it even if two reminder runs overlap.
--
-- Re-runs on every deploy. CREATE TABLE IF NOT EXISTS is safe the second time.

CREATE TABLE IF NOT EXISTS chat_reply_reminders (
  conversation_id VARCHAR(160) NOT NULL,
  message_id      VARCHAR(64)  NOT NULL,
  recipient_id    CHAR(36)     NOT NULL,
  sent_at         DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (conversation_id, message_id),
  CONSTRAINT fk_reply_reminder_recipient FOREIGN KEY (recipient_id) REFERENCES users (id) ON DELETE CASCADE,
  INDEX idx_reply_reminder_recipient (recipient_id, sent_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
