const { query } = require("../config/db");
const { ApiError } = require("./errorHandler");

async function requireAdmin(req, res, next) {
  if (!req.user || !req.user.id) {
    return next(new ApiError(401, "Authentication required"));
  }

  try {
    const [user] = await query("SELECT role FROM users WHERE id = ?", [req.user.id]);
    if (!user || user.role !== "admin") {
      return next(new ApiError(403, "Access denied. Admin privileges required."));
    }
    next();
  } catch (error) {
    next(new ApiError(500, "Internal server error checking admin status"));
  }
}

module.exports = { requireAdmin };
