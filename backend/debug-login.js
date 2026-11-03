const bcrypt = require("bcryptjs"); // ya 'bcrypt' jo aapke project mein ho
const { query } = require("./src/config/db");

async function check() {
  try {
    const users = await query(
      "SELECT id, username, password_hash FROM users WHERE username = ?",
      ["nafarha"],
    );
    if (!users.length) {
      console.log("❌ User nafarha not found in database!");
      return;
    }

    const user = users[0];
    console.log("✅ User found:", user.username);
    console.log("Hash in DB:", user.password_hash);

    // Check if password matches
    const isMatch = await bcrypt.compare("milaan123", user.password_hash);
    console.log('Does "milaan123" match the hash?', isMatch);

    if (!isMatch) {
      console.log("🔴 Password reset did not work properly. Let's fix it.");
      const newHash = await bcrypt.hash("milaan123", 10);
      await query("UPDATE users SET password_hash = ? WHERE username = ?", [
        newHash,
        "nafarha",
      ]);
      console.log("✅ Password force-reset to milaan123");
    }
  } catch (err) {
    console.error("Error:", err);
  }
  process.exit(0);
}

check();
