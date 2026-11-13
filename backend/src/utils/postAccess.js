/**
 * Who may see a member's posts - the Instagram rule, with a match standing
 * in for a follow (this app has no followers):
 *
 * - your own posts: always
 * - a block either way round: never
 * - a public account: everyone
 * - a private account: only the people they have matched with
 *
 * Nobody is ever shown how many matches someone has; the match only opens
 * the door.
 */
function postAccess({ self, blocked, isPrivate, matched }) {
  if (self) return "open";
  if (blocked) return "hidden";
  if (!isPrivate) return "open";
  return matched ? "open" : "locked";
}

module.exports = { postAccess };
