import { Pool, types, type PoolClient, type QueryResultRow } from "pg";

// NUMERIC -> number (all money columns are NUMERIC(10,3), i.e. baisa precision).
types.setTypeParser(1700, (v) => parseFloat(v));
// BIGINT (audit_logs.id, COUNT) -> number.
types.setTypeParser(20, (v) => parseInt(v, 10));

const globalForPg = globalThis as unknown as { __shqPool?: Pool };

function createPool() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return new Pool({
    connectionString: url,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });
}

export function pool(): Pool {
  if (!globalForPg.__shqPool) globalForPg.__shqPool = createPool();
  return globalForPg.__shqPool;
}

export type Db = Pick<PoolClient, "query">;

export async function query<T extends QueryResultRow = any>(text: string, params: unknown[] = []): Promise<T[]> {
  const res = await pool().query<T>(text, params as any[]);
  return res.rows;
}

export async function queryOne<T extends QueryResultRow = any>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/** Run `fn` inside a transaction. Rolls back on any thrown error. */
export async function tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    throw e;
  } finally {
    client.release();
  }
}
