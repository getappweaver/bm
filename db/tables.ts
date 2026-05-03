// ---------------------------------------------------------------------------
// plugins/bm/db/tables.ts — bm_bookmarks DDL
// ---------------------------------------------------------------------------

import type { Database } from 'bun:sqlite';

export function createBmTable(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS bm_bookmarks (
      id          INTEGER PRIMARY KEY,
      url         TEXT    NOT NULL UNIQUE,
      title       TEXT    NOT NULL,
      summary     TEXT,
      description TEXT,
      category    TEXT    NOT NULL,
      tags        TEXT    NOT NULL,
      media_type  TEXT    NOT NULL,
      in_queue    INTEGER NOT NULL,
      consumed_at INTEGER,
      created_at  INTEGER NOT NULL,
      nostr_naddr TEXT,
      published_at INTEGER
    )
  `);

  db.run(
    'CREATE INDEX IF NOT EXISTS idx_bm_bookmarks_category ON bm_bookmarks(category)',
  );

  db.run(
    'CREATE INDEX IF NOT EXISTS idx_bm_bookmarks_created_at ON bm_bookmarks(created_at DESC)',
  );

  db.run(
    'CREATE INDEX IF NOT EXISTS idx_bm_bookmarks_in_queue ON bm_bookmarks(in_queue)',
  );

  db.run(
    'CREATE INDEX IF NOT EXISTS idx_bm_bookmarks_consumed_at ON bm_bookmarks(consumed_at)',
  );

  db.run(
    'CREATE INDEX IF NOT EXISTS idx_bm_bookmarks_media_type ON bm_bookmarks(media_type)',
  );
}
