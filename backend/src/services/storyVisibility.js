/**
 * Who may see a story, as SQL on `s` (the story) and `u` (its owner).
 *
 * - Your own stories, always.
 * - A close-friends story: only the people on the owner's list.
 * - Any other story: public accounts, your matches, and anyone it mentions.
 *
 * Blocks and deleted accounts are checked by the query using this.
 */
const VISIBLE_TO_VIEWER = `(s.user_id = ?
   OR (s.audience = 'close'
       AND EXISTS (SELECT 1 FROM close_friends cf WHERE cf.owner_id = s.user_id AND cf.friend_id = ?))
   OR (s.audience <> 'close'
       AND (u.is_private = 0
            OR EXISTS (SELECT 1 FROM mutual_matches mm
                        WHERE (mm.user_a_id = ? AND mm.user_b_id = u.id)
                           OR (mm.user_a_id = u.id AND mm.user_b_id = ?))
            OR EXISTS (SELECT 1 FROM story_mentions sm WHERE sm.story_id = s.id AND sm.user_id = ?))))`;

/** The viewer's id, once for each place VISIBLE_TO_VIEWER asks for it. */
const visibleParams = (viewerId) => [viewerId, viewerId, viewerId, viewerId, viewerId];

module.exports = { VISIBLE_TO_VIEWER, visibleParams };
