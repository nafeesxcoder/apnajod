const { query } = require("./src/config/db");

async function update() {
  try {
    await query("UPDATE matching_preferences SET looking_for = 'everyone'");
    console.log("✅ All users looking_for updated to everyone");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

update();
