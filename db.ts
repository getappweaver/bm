// ---------------------------------------------------------------------------
// plugins/bm/db.ts — Schema and CRUD for the bm plugin
//
// Replace the minimal table and stubs with your real schema and logic:
// - createBmTable: define your tables and indexes
// - getBm, listBms, createBm, updateBm, deleteBm
// - If you need a draft tree (e.g. hierarchical create): add createBmsFromDraftTree
//   and wire it in commands.ts (accept subcommand).
// ---------------------------------------------------------------------------
import type { Database } from 'bun:sqlite';

import type { Bm, CreateBmInput, UpdateBmInput } from './types';

function rowToBm(row: Record<string, unknown>): Bm {
  return {
    id: Number(row.id),
    data: String(row.data),
    created_at: Number(row.created_at),
  };
}

export function createBmTable(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS bms (
      id         INTEGER PRIMARY KEY,
      data       TEXT    NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);
}

export function createBm(
  db: Database,
  input: CreateBmInput,
  _source?: string,
): Bm {
  const now = Date.now();

  const info = db.run(`INSERT INTO bms (data, created_at) VALUES (?, ?)`, [
    input.data,
    now,
  ]);

  const id = Number(info.lastInsertRowid);

  return getBm(db, id)!;
}

export function getBm(db: Database, id: number): Bm | null {
  const row = db.prepare('SELECT * FROM bms WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;

  return row ? rowToBm(row) : null;
}

export function listBms(db: Database): Bm[] {
  const rows = db.prepare('SELECT * FROM bms ORDER BY id').all() as Record<
    string,
    unknown
  >[];

  return rows.map(rowToBm);
}

export function updateBm(db: Database, input: UpdateBmInput): Bm | null {
  const existing = getBm(db, input.id);

  if (!existing) {
    return null;
  }

  if (input.data !== undefined) {
    db.run('UPDATE bms SET data = ? WHERE id = ?', [input.data, input.id]);
  }

  return getBm(db, input.id);
}

export function deleteBm(db: Database, id: number): boolean {
  const info = db.prepare('DELETE FROM bms WHERE id = ?').run(id);

  return info.changes > 0;
}
