const { query } = require("./src/config/db");

async function check() {
  try {
    const rows = await query("SELECT user_id, first_name, about FROM profiles");
    console.log("Profiles in DB:", JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

check();
