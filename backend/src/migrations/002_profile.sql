-- Member profile (core details)
CREATE TABLE IF NOT EXISTS profiles (
  user_id CHAR(36) PRIMARY KEY,
  first_name VARCHAR(80),
  gender ENUM('woman','man','nonbinary'),
  age INT,
  height VARCHAR(30),
  city VARCHAR(120),
  profession VARCHAR(120),
  religion VARCHAR(60),
  community VARCHAR(80),
  about TEXT,
  verified TINYINT(1) NOT NULL DEFAULT 0,
  selfie_uri TEXT,
  voice_intro_uri TEXT,
  onboarding_complete TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Profile photos (ordered, up to 3+)
CREATE TABLE IF NOT EXISTS profile_photos (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  photo_url TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_photos_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_photos_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Vibes (tags the member picked, e.g. "Family First")
CREATE TABLE IF NOT EXISTS profile_vibes (
  user_id CHAR(36) NOT NULL,
  vibe VARCHAR(60) NOT NULL,
  PRIMARY KEY (user_id, vibe),
  CONSTRAINT fk_vibes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Relationship intent + alignment answers
CREATE TABLE IF NOT EXISTS profile_intent (
  user_id CHAR(36) PRIMARY KEY,
  intent VARCHAR(80),
  timeline VARCHAR(80),
  children VARCHAR(80),
  family VARCHAR(80),
  relocation VARCHAR(80),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_intent_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Matching preferences (who they want to see)
CREATE TABLE IF NOT EXISTS matching_preferences (
  user_id CHAR(36) PRIMARY KEY,
  looking_for ENUM('women','men','everyone') DEFAULT 'everyone',
  min_age INT DEFAULT 21,
  max_age INT DEFAULT 45,
  cities JSON,
  intents JSON,
  must_have_vibes JSON,
  family_priority VARCHAR(60),
  children VARCHAR(60),
  marriage_timeline VARCHAR(60),
  relocation VARCHAR(60),
  distance_preference INT,
  smart_discovery TINYINT(1) NOT NULL DEFAULT 1,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_prefs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Experience mode: seeking (normal matching) vs couple
CREATE TABLE IF NOT EXISTS experience_mode (
  user_id CHAR(36) PRIMARY KEY,
  mode ENUM('seeking','couple') NOT NULL DEFAULT 'seeking',
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_mode_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Couple connections (two users linked together)
CREATE TABLE IF NOT EXISTS couple_connections (
  id CHAR(36) PRIMARY KEY,
  requester_id CHAR(36) NOT NULL,
  partner_id CHAR(36) NOT NULL,
  status ENUM('pending','active','declined','removed') NOT NULL DEFAULT 'pending',
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_couple_requester FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_couple_partner FOREIGN KEY (partner_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_couple_requester (requester_id),
  INDEX idx_couple_partner (partner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;