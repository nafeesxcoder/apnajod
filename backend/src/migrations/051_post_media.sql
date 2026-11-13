-- More than one photo in a post (swipe through them, like Instagram).
-- posts.media_url stays the first photo, so the grid, the feed and every
-- older post work unchanged. A post with several photos lists all of them
-- here in order. They go with the post (ON DELETE CASCADE).
-- Re-runs on every deploy.
CREATE TABLE IF NOT EXISTS post_media (
  post_id CHAR(36) NOT NULL,
  position TINYINT UNSIGNED NOT NULL,
  media_url VARCHAR(500) NOT NULL,
  PRIMARY KEY (post_id, position),
  CONSTRAINT fk_post_media_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
