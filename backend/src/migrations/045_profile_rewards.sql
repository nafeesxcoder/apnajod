-- One-time rewards for finishing your profile.
--
-- When a member's profile reaches 100% (photo, name, age, gender, a bio,
-- three hobbies, city and work, the future questions and an approved
-- selfie) they get one free Super Like, once ever. The primary key is what
-- makes it once: a second insert for the same member and reward is ignored.
--
-- Re-runs on every deploy - CREATE TABLE IF NOT EXISTS is safe the second time.

CREATE TABLE IF NOT EXISTS profile_rewards (
  user_id    CHAR(36)    NOT NULL,
  reward     VARCHAR(30) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (user_id, reward),
  CONSTRAINT fk_profile_reward_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
