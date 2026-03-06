import { Pool, type QueryResultRow } from "pg";

const globalForDb = globalThis as unknown as { pool?: Pool };

export const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    max: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
}

export async function sql<T extends QueryResultRow>(query: string, values: unknown[] = []): Promise<T[]> {
  const client = await pool.connect();
  try {
    const result = await client.query<T>(query, values);
    return result.rows;
  } finally {
    client.release();
  }
}
