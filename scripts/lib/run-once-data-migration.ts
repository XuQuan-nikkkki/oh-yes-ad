import type { Client } from "pg";

type MigrationResult = {
  rowsUpdated?: number;
};

type RunOnceResult =
  | { applied: true; rowsUpdated: number | null }
  | { applied: false; rowsUpdated: number | null };

export const runOnceDataMigration = async (
  client: Client,
  key: string,
  migrate: (client: Client) => Promise<MigrationResult>,
): Promise<RunOnceResult> => {
  await client.query("BEGIN");
  try {
    // Concurrent builds wait here, then recheck the marker after the first commits.
    await client.query('LOCK TABLE "DataMigration" IN SHARE ROW EXCLUSIVE MODE');
    const existing = await client.query<{ rowsUpdated: number | null }>(
      `SELECT "rowsUpdated" FROM "DataMigration" WHERE "key" = $1`,
      [key],
    );
    if (existing.rows[0]) {
      await client.query("COMMIT");
      return { applied: false, rowsUpdated: existing.rows[0].rowsUpdated };
    }

    const result = await migrate(client);
    const rowsUpdated = result.rowsUpdated ?? null;
    await client.query(
      `INSERT INTO "DataMigration" ("key", "rowsUpdated") VALUES ($1, $2)`,
      [key, rowsUpdated],
    );
    await client.query("COMMIT");
    return { applied: true, rowsUpdated };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
};
