// ---------------------------------------------------------------------------
// plugins/bm/drafts/tables.ts — bm_drafts DDL
// ---------------------------------------------------------------------------

import type { Database } from 'bun:sqlite';

export function createBmDraftsTable(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS bm_drafts (
      id              INTEGER PRIMARY KEY,
      session_id      TEXT NOT NULL DEFAULT '',
      kind            TEXT NOT NULL,
      input           TEXT NOT NULL,
      original_prompt TEXT NOT NULL DEFAULT '',
      created_at      INTEGER NOT NULL
    )
  `);

  const cols = db.prepare('PRAGMA table_info(bm_drafts)').all() as {
    name: string;
  }[];

  if (!cols.some((column) => column.name === 'session_id')) {
    db.run(
      `ALTER TABLE bm_drafts ADD COLUMN session_id TEXT NOT NULL DEFAULT ''`,
    );
  }
}
