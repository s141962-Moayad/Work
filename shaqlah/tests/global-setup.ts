import { readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

export default async function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgres://shaqlah:shaqlah@localhost:5432/shaqlah_test";
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  await client.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await client.query(readFileSync(join(__dirname, "..", "db", "schema.sql"), "utf8"));
  await client.end();
}
