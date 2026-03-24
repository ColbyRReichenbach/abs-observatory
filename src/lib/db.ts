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

export async function sqlOne<T extends QueryResultRow>(
  query: string,
  values: unknown[] = [],
): Promise<T | null> {
  const rows = await sql<T>(query, values);
  return rows[0] ?? null;
}

export async function sqlExec(query: string, values: unknown[] = []): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(query, values);
  } finally {
    client.release();
  }
}

export async function withTransaction<T>(
  callback: (query: <R extends QueryResultRow>(statement: string, values?: unknown[]) => Promise<R[]>) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const query = async <R extends QueryResultRow>(statement: string, values: unknown[] = []) => {
      const result = await client.query<R>(statement, values);
      return result.rows;
    };
    const value = await callback(query);
    await client.query("COMMIT");
    return value;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
