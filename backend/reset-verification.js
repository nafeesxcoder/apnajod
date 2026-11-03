const { query } = require("./src/config/db");

async function reset() {
  try {
    await query(
      `UPDATE profiles 
       SET verification_status = 'none', verified = 0, selfie_uri = '' 
       WHERE user_id = (SELECT id FROM users WHERE username = 'nafarha')`,
    );
    console.log("✅ Verification reset for nafarha!");
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
  process.exit(0);
}

reset();
