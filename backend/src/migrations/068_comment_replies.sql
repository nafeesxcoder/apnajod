-- Replies to comments on posts, like Instagram: a reply sits under the
-- comment it answers (one level deep), and says whom it answers.
-- Deleting a comment deletes its replies too (done in the app).
ALTER TABLE post_comments ADD COLUMN parent_id CHAR(36) NULL;
ALTER TABLE post_comments ADD COLUMN reply_to_user_id CHAR(36) NULL;
ALTER TABLE post_comments ADD INDEX idx_post_comment_parent (parent_id);
ALTER TABLE post_comments ADD INDEX idx_post_comment_reply_to (reply_to_user_id, created_at);
