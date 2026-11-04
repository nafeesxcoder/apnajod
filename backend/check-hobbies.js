const { query } = require("./src/config/db");

async function check() {
  try {
    // Check if column exists
    const cols = await query("SHOW COLUMNS FROM profiles LIKE 'hobbies'");
    console.log("Column exists:", cols);

    // Check user data
    const rows = await query(
      "SELECT user_id, first_name, hobbies FROM profiles",
    );
    console.log("Profiles:", rows);
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

check();
