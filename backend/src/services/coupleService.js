const crypto = require('crypto');
const { query } = require('../config/db');

const REQUEST_TTL_DAYS = 7;

function toPartnerRow(profileRow, userId) {
  return {
    member_id: userId,
    display_name: profileRow?.first_name || 'Member',
    city: profileRow?.city || '',
    profession: profileRow?.profession || '',
    verified: !!profileRow?.verified,
  };
}

async function findActiveConnection(userId) {
  const rows = await query(
    `SELECT * FROM couple_connections
     WHERE (requester_id = ? OR partner_id = ?) AND status = 'active'
     ORDER BY updated_at DESC LIMIT 1`,
    [userId, userId],
  );
  return rows[0] || null;
}

// Couple Mode originally assumed exactly one partner, so this is the same
// shape as findActiveConnection but returns every active connection instead
// of just the most recent — lets a member keep more than one couple space
// open at once instead of having to disconnect before connecting again.
async function findActiveConnections(userId) {
  return query(
    `SELECT * FROM couple_connections
     WHERE (requester_id = ? OR partner_id = ?) AND status = 'active'
     ORDER BY updated_at DESC`,
    [userId, userId],
  );
}

// Accepts either a phone number or an email address and looks the partner
// up by whichever one was given, so a couple can connect with either —
// previously only a phone-number match was supported here.
function normalizePhone(value) {
  let phone = String(value || '').trim().replace(/[^\d+]/g, '');
  if (phone.startsWith('00')) phone = `+${phone.slice(2)}`;
  return phone;
}

const PHONE_RE = /^\+[1-9]\d{7,14}$/;
const MAX_CONTACTS_PER_MATCH = 300;

async function searchByIdentifier(identifier, selfUserId) {
  const isEmail = identifier.includes('@');
  const column = isEmail ? 'email' : 'phone';
  const value = isEmail ? identifier.trim().toLowerCase() : normalizePhone(identifier);
  const users = await query(
    `SELECT id FROM users WHERE ${column} = ? AND id != ? LIMIT 1`,
    [value, selfUserId],
  );
  if (!users.length) return null;
  const targetId = users[0].id;
  const [profile] = await query('SELECT * FROM profiles WHERE user_id = ?', [targetId]);
  return toPartnerRow(profile, targetId);
}

async function createRequest(requesterId, targetId) {
  if (requesterId === targetId) {
    const err = new Error('You cannot send a couple request to yourself.');
    err.status = 400;
    throw err;
  }
  // Couple Mode no longer limits a member to a single partner — they can
  // hold several active connections at once — so an existing connection no
  // longer blocks sending a new request. Only block re-requesting someone
  // they're already actively connected to, or already have a pending
  // request out to.
  const activeWithTarget = await query(
    `SELECT id FROM couple_connections
     WHERE status = 'active'
       AND ((requester_id = ? AND partner_id = ?) OR (requester_id = ? AND partner_id = ?))`,
    [requesterId, targetId, targetId, requesterId],
  );
  if (activeWithTarget.length) {
    const err = new Error('You are already connected to this member.');
    err.status = 409;
    throw err;
  }
  const pending = await query(
    `SELECT id FROM couple_requests
     WHERE requester_id = ? AND target_id = ? AND status = 'pending' AND expires_at > NOW(6)`,
    [requesterId, targetId],
  );
  if (pending.length) {
    const err = new Error('A request to this member is already pending.');
    err.status = 409;
    throw err;
  }
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO couple_requests (id, requester_id, target_id, status, expires_at)
     VALUES (?, ?, ?, 'pending', DATE_ADD(NOW(6), INTERVAL ${REQUEST_TTL_DAYS} DAY))`,
    [id, requesterId, targetId],
  );
  const [row] = await query('SELECT * FROM couple_requests WHERE id = ?', [id]);
  const [targetProfile] = await query('SELECT * FROM profiles WHERE user_id = ?', [targetId]);
  return {
    request_id: row.id,
    member: toPartnerRow(targetProfile, targetId),
    status: row.status,
    created_at: row.created_at,
    expires_at: row.expires_at,
  };
}

async function respondToRequest(userId, requestId, accept) {
  const rows = await query(
    `SELECT * FROM couple_requests WHERE id = ? AND target_id = ? AND status = 'pending' AND expires_at > NOW(6)`,
    [requestId, userId],
  );
  if (!rows.length) {
    const err = new Error('This request is no longer available.');
    err.status = 404;
    throw err;
  }
  const request = rows[0];
  if (!accept) {
    await query(`UPDATE couple_requests SET status = 'declined' WHERE id = ?`, [requestId]);
    return getHub(userId);
  }
  await query(`UPDATE couple_requests SET status = 'accepted' WHERE id = ?`, [requestId]);
  const connectionId = crypto.randomUUID();
  await query(
    `INSERT INTO couple_connections (id, requester_id, partner_id, status)
     VALUES (?, ?, ?, 'active')`,
    [connectionId, request.requester_id, userId],
  );
  await query(
    `INSERT INTO experience_mode (user_id, mode) VALUES (?, 'couple')
     ON DUPLICATE KEY UPDATE mode = 'couple'`,
    [userId],
  );
  await query(
    `INSERT INTO experience_mode (user_id, mode) VALUES (?, 'couple')
     ON DUPLICATE KEY UPDATE mode = 'couple'`,
    [request.requester_id],
  );
  await query(
    `UPDATE couple_requests SET status = 'cancelled'
     WHERE status = 'pending' AND id != ? AND (requester_id IN (?, ?) OR target_id IN (?, ?))`,
    [requestId, userId, request.requester_id, userId, request.requester_id],
  );
  return getHub(userId);
}

function previewFor(payload) {
  let p = payload;
  if (typeof p === 'string') { try { p = JSON.parse(p); } catch { p = {}; } }
  p = p || {};
  const clip = (t) => (String(t).length > 80 ? `${String(t).slice(0, 80)}…` : String(t));
  switch (p.type) {
    case 'image': return p.text ? `📷 ${clip(p.text)}` : '📷 Photo';
    case 'gif': return 'GIF';
    case 'sticker': return 'Sticker';
    case 'voice': return '🎤 Voice message';
    case 'location': return '📍 Location';
    case 'document': return '📄 Document';
    case 'date': return '☕ Meet-up plan';
    case 'festival': return `✨ ${clip((p.festival && p.festival.greeting) || 'Festival wish')}`;
    case 'snap': return '📸 Snap';
    default: return clip(p.text || 'Message');
  }
}

async function connectionActivity(connectionId, userId) {
  try {
    const rows = await query(
      `SELECT sender_id, payload, created_at_ms, hidden_by FROM chat_messages
       WHERE conversation_id = ? AND deleted_for_everyone = 0
       ORDER BY created_at_ms DESC LIMIT 20`,
      [connectionId],
    );
    const visible = rows.find((r) => {
      let hidden = r.hidden_by;
      if (typeof hidden === 'string') { try { hidden = JSON.parse(hidden); } catch { hidden = []; } }
      return !(Array.isArray(hidden) && hidden.includes(userId));
    });
    const [unread] = await query(
      `SELECT COUNT(*) AS n FROM chat_messages
       WHERE conversation_id = ? AND sender_id <> ? AND status <> 'read' AND deleted_for_everyone = 0`,
      [connectionId, userId],
    );
    return {
      last_message: visible
        ? { preview: previewFor(visible.payload), at: Number(visible.created_at_ms), mine: visible.sender_id === userId }
        : null,
      unread_count: Number(unread?.n || 0),
    };
  } catch (err) {
    return { last_message: null, unread_count: 0 };
  }
}

async function getHub(userId) {
  const [modeRow] = await query('SELECT mode FROM experience_mode WHERE user_id = ?', [userId]);
  const experienceMode = modeRow?.mode || 'seeking';

  const activeRows = await findActiveConnections(userId);
  const connections = [];
  for (const active of activeRows) {
    const partnerId = active.requester_id === userId ? active.partner_id : active.requester_id;
    const [partnerProfile] = await query('SELECT * FROM profiles WHERE user_id = ?', [partnerId]);
    const activity = await connectionActivity(active.id, userId);
    connections.push({
      connection_id: active.id,
      partner_member_id: partnerId,
      partner_display_name: partnerProfile?.first_name || 'Your partner',
      last_message: activity.last_message,
      unread_count: activity.unread_count,
    });
  }
  // Most recent conversation first, like WhatsApp.
  connections.sort((a, b) => (b.last_message?.at || 0) - (a.last_message?.at || 0));
  // `connection` (singular) is kept for older clients/screens that only
  // know about one partner — it's just the most recently active one.
  const connection = connections[0] || null;

  const incoming = await query(
    `SELECT * FROM couple_requests WHERE target_id = ? AND status = 'pending' AND expires_at > NOW(6)
     ORDER BY created_at DESC`,
    [userId],
  );
  const outgoing = await query(
    `SELECT * FROM couple_requests WHERE requester_id = ? AND status = 'pending' AND expires_at > NOW(6)
     ORDER BY created_at DESC`,
    [userId],
  );

  const hydrateRequests = async (rows, otherIdField) => {
    const results = [];
    for (const row of rows) {
      const otherId = row[otherIdField];
      const [profile] = await query('SELECT * FROM profiles WHERE user_id = ?', [otherId]);
      results.push({
        request_id: row.id,
        member: toPartnerRow(profile, otherId),
        status: row.status,
        created_at: row.created_at,
        expires_at: row.expires_at,
      });
    }
    return results;
  };

  return {
    experience_mode: connection ? 'couple' : experienceMode,
    connection,
    connections,
    incoming_requests: await hydrateRequests(incoming, 'requester_id'),
    outgoing_requests: await hydrateRequests(outgoing, 'target_id'),
  };
}

async function setMode(userId, enabled) {
  await query(
    `INSERT INTO experience_mode (user_id, mode) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE mode = VALUES(mode)`,
    [userId, enabled ? 'couple' : 'seeking'],
  );
}

// connectionId picks which of a member's (possibly several) active
// connections to end; omitting it keeps the old single-partner behavior of
// ending the most recently active one. Only drops either side back to
// 'seeking' mode once they have no OTHER active connections left — with
// multiple partners allowed now, ending one shouldn't kick someone out of
// Couple Mode entirely while they're still connected to someone else.
async function disconnectConnection(userId, connectionId) {
  const active = connectionId
    ? (await query(
        `SELECT * FROM couple_connections
         WHERE id = ? AND status = 'active' AND (requester_id = ? OR partner_id = ?)`,
        [connectionId, userId, userId],
      ))[0]
    : await findActiveConnection(userId);
  if (!active) return { ok: true };
  await query(`UPDATE couple_connections SET status = 'removed' WHERE id = ?`, [active.id]);
  const otherId = active.requester_id === userId ? active.partner_id : active.requester_id;
  const revertIfNoneLeft = async (id) => {
    const remaining = await findActiveConnections(id);
    if (remaining.length) return;
    await query(
      `INSERT INTO experience_mode (user_id, mode) VALUES (?, 'seeking')
       ON DUPLICATE KEY UPDATE mode = 'seeking'`,
      [id],
    );
  };
  await revertIfNoneLeft(userId);
  await revertIfNoneLeft(otherId);
  return { ok: true };
}

// WhatsApp-style contact matching: the app sends the phone numbers from the
// member's address book and gets back only the ones that already have a
// Apnajoda account (plus whether they're already connected / pending), so
// the rest can be invited. Only name, city, profession and the verified
// badge come back; phone numbers and emails are never returned.
async function matchContacts(userId, rawPhones) {
  const phones = [...new Set((Array.isArray(rawPhones) ? rawPhones : []).map(normalizePhone))]
    .filter((phone) => PHONE_RE.test(phone))
    .slice(0, MAX_CONTACTS_PER_MATCH);
  if (!phones.length) return [];
  const placeholders = phones.map(() => '?').join(',');
  const users = await query(
    `SELECT id, phone FROM users WHERE phone IN (${placeholders}) AND id != ?`,
    [...phones, userId],
  );
  if (!users.length) return [];

  const connected = new Set();
  for (const row of await findActiveConnections(userId)) {
    connected.add(row.requester_id === userId ? row.partner_id : row.requester_id);
  }
  const pendingOut = new Set();
  const pendingIn = new Set();
  const pending = await query(
    `SELECT requester_id, target_id FROM couple_requests
     WHERE status = 'pending' AND expires_at > NOW(6) AND (requester_id = ? OR target_id = ?)`,
    [userId, userId],
  );
  for (const row of pending) {
    if (row.requester_id === userId) pendingOut.add(row.target_id);
    else pendingIn.add(row.requester_id);
  }

  const results = [];
  for (const user of users) {
    const [profile] = await query('SELECT * FROM profiles WHERE user_id = ?', [user.id]);
    let relation = 'none';
    if (connected.has(user.id)) relation = 'connected';
    else if (pendingOut.has(user.id)) relation = 'pending_out';
    else if (pendingIn.has(user.id)) relation = 'pending_in';
    results.push({ phone: user.phone, relation, member: toPartnerRow(profile, user.id) });
  }
  return results;
}

// Full profile of someone the member is actively connected to, for the
// WhatsApp-style "tap a partner to see their profile" view. Contact details
// (phone / email) are deliberately not included.
async function getPartnerProfile(userId, connectionId) {
  const [connection] = await query(
    `SELECT * FROM couple_connections
     WHERE id = ? AND status = 'active' AND (requester_id = ? OR partner_id = ?)`,
    [connectionId, userId, userId],
  );
  if (!connection) {
    const err = new Error('This partner connection is no longer available.');
    err.status = 404;
    throw err;
  }
  const partnerId = connection.requester_id === userId ? connection.partner_id : connection.requester_id;
  const [profile] = await query('SELECT * FROM profiles WHERE user_id = ?', [partnerId]);
  const photos = await query(
    'SELECT photo_url FROM profile_photos WHERE user_id = ? ORDER BY position ASC',
    [partnerId],
  );
  const vibes = await query('SELECT vibe FROM profile_vibes WHERE user_id = ?', [partnerId]);
  return {
    connection_id: connection.id,
    member_id: partnerId,
    display_name: profile?.first_name || 'Your partner',
    age: profile?.age ?? null,
    city: profile?.city || '',
    profession: profile?.profession || '',
    religion: profile?.religion || '',
    community: profile?.community || '',
    height: profile?.height || '',
    about: profile?.about || '',
    verified: !!profile?.verified,
    photos: photos.map((row) => row.photo_url),
    vibes: vibes.map((row) => row.vibe),
    connected_since: connection.created_at || null,
  };
}

module.exports = {
  searchByIdentifier,
  createRequest,
  respondToRequest,
  getHub,
  setMode,
  disconnectConnection,
  matchContacts,
  getPartnerProfile,
};
