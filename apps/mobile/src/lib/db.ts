import * as SQLite from 'expo-sqlite';

/**
 * Base locale SQLite (mode hors ligne, M12).
 * - kv : jetons d'auth et identifiants techniques (deviceId, curseur sync)
 * - pending_ops : file d'opérations idempotentes en attente de push
 */

const db = SQLite.openDatabaseSync('immuniq.db');

db.execSync(`
  CREATE TABLE IF NOT EXISTS kv (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS pending_ops (
    op_id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    entity_id TEXT,
    payload TEXT NOT NULL,
    client_timestamp TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    error TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export interface PendingOp {
  op_id: string;
  type: string;
  entity_id: string | null;
  payload: Record<string, unknown>;
  client_timestamp: string;
  status: string;
  error: string | null;
}

export const kv = {
  get(key: string): string | null {
    const row = db.getFirstSync<{ value: string }>('SELECT value FROM kv WHERE key = ?', key);
    return row?.value ?? null;
  },
  set(key: string, value: string) {
    db.runSync('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', key, value);
  },
  remove(key: string) {
    db.runSync('DELETE FROM kv WHERE key = ?', key);
  },
};

export const pendingOps = {
  enqueue(op: { opId: string; type: string; entityId?: string; payload: Record<string, unknown> }) {
    db.runSync(
      'INSERT OR REPLACE INTO pending_ops (op_id, type, entity_id, payload, client_timestamp) VALUES (?, ?, ?, ?, ?)',
      op.opId,
      op.type,
      op.entityId ?? null,
      JSON.stringify(op.payload),
      new Date().toISOString(),
    );
  },

  list(status = 'pending'): PendingOp[] {
    const rows = db.getAllSync<{ payload: string; [k: string]: unknown }>(
      'SELECT * FROM pending_ops WHERE status = ? ORDER BY created_at ASC',
      status,
    );
    return rows.map((r) => ({ ...r, payload: JSON.parse(r.payload as string) })) as PendingOp[];
  },

  count(status = 'pending'): number {
    const row = db.getFirstSync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM pending_ops WHERE status = ?',
      status,
    );
    return row?.n ?? 0;
  },

  mark(opId: string, status: 'applied' | 'rejected' | 'duplicate', error?: string) {
    db.runSync('UPDATE pending_ops SET status = ?, error = ? WHERE op_id = ?', status, error ?? null, opId);
  },

  clearApplied() {
    db.runSync("DELETE FROM pending_ops WHERE status IN ('applied', 'duplicate')");
  },
};
