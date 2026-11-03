const fs = require("fs");
const path = require("path");
const { pool } = require("../config/db");

async function run() {
  const migrationsDir = __dirname;
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  const connection = await pool.getConnection();
  try {
    let totalStatements = 0;
    for (const file of files) {
      const sqlPath = path.join(migrationsDir, file);
      // Strip a UTF-8 BOM: Windows editors add one silently, and it would be
      // sent to MySQL as part of the first statement. Line comments go too,
      // because statements are split on ";" and a semicolon inside a comment
      // would otherwise cut a statement in half.
      const sql = fs
        .readFileSync(sqlPath, "utf8")
        .replace(/^\uFEFF/, "")
        .replace(/^\s*--.*$/gm, "")
        .replace(/\s--.*$/gm, "");
      const statements = sql
        .split(";")
        .map((statement) => statement.trim())
        .filter(Boolean);
      for (const statement of statements) {
        try {
          await connection.query(statement);
        } catch (error) {
          const skippable = ["ER_DUP_FIELDNAME", "ER_DUP_KEYNAME", "ER_TABLE_EXISTS_ERROR"];
          if (!skippable.includes(error.code)) throw error;
        }
      }
      console.log(`${file}: ${statements.length} statements executed.`);
      totalStatements += statements.length;
    }
    console.log(
      `Migration complete: ${totalStatements} statements executed across ${files.length} files.`,
    );
  } finally {
    connection.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
