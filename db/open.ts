// ---------------------------------------------------------------------------
// plugins/bm/db/open.ts — open plugin SQLite (CLI + plugin)
// ---------------------------------------------------------------------------

import { join } from 'path';

import { Database } from 'bun:sqlite';

import { createBmDraftsTable } from '../drafts';

import {
  createBmSearchSessionsTable,
  deleteExpiredBmSearchSessions,
} from './search-sessions';
import { createBmTable } from './tables';

export function openDb(): Database {
  const db = new Database(join(import.meta.dir, '..', 'db.sqlite'), {
    strict: true,
  });

  db.run('PRAGMA foreign_keys = ON');
  db.run('PRAGMA journal_mode=WAL');
  createBmTable(db);
  createBmDraftsTable(db);
  createBmSearchSessionsTable(db);
  deleteExpiredBmSearchSessions(db);

  return db;
}
