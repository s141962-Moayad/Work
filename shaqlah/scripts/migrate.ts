import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pool } from "../src/lib/db";

async function main() {
  const sql = readFileSync(join(__dirname, "..", "db", "schema.sql"), "utf8");
  await pool().query(sql);
  console.log("✓ database schema is up to date");
  await pool().end();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
