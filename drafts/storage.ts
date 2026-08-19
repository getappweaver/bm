// ---------------------------------------------------------------------------
// plugins/bm/drafts/storage.ts — bm_drafts CRUD
// ---------------------------------------------------------------------------

import { randomUUID } from 'node:crypto';

import type { Database } from 'bun:sqlite';

import { rowToDraft } from './row-map';
import type { BmDraftEntry, BmDraftRow } from './types';

export function createDraftSessionId(): string {
  return randomUUID();
}

export function storeDraft(db: Database, entry: BmDraftEntry): number {
  const now = Date.now();

  const info = db.run(
    `INSERT INTO bm_drafts (session_id, kind, input, original_prompt, created_at) VALUES (?, ?, ?, ?, ?)`,
    [
      entry.sessionId,
      entry.kind,
      JSON.stringify(entry.input),
      entry.originalPrompt,
      now,
    ],
  );

  return Number(info.lastInsertRowid);
}

export function getDraft(db: Database, id: number): BmDraftRow | null {
  const row = db.prepare('SELECT * FROM bm_drafts WHERE id = ?').get(id) as
    Record<string, unknown> | undefined;

  if (!row) {
    return null;
  }

  return rowToDraft(row);
}

export function listDrafts(db: Database): BmDraftRow[] {
  const rows = db
    .prepare('SELECT * FROM bm_drafts ORDER BY id')
    .all() as Record<string, unknown>[];

  return rows.map(rowToDraft);
}

export function listDraftsBySession(
  db: Database,
  sessionId: string,
): BmDraftRow[] {
  const rows = db
    .prepare('SELECT * FROM bm_drafts WHERE session_id = ? ORDER BY id')
    .all(sessionId) as Record<string, unknown>[];

  return rows.map(rowToDraft);
}

export function getDraftBySessionIndex(
  db: Database,
  sessionId: string,
  index: number,
): BmDraftRow | null {
  return listDraftsBySession(db, sessionId)[index] ?? null;
}

export function deleteDraft(db: Database, id: number): boolean {
  return db.prepare('DELETE FROM bm_drafts WHERE id = ?').run(id).changes > 0;
}

export function updateDraftInput(
  db: Database,
  id: number,
  input: BmDraftEntry['input'],
): boolean {
  const info = db
    .prepare('UPDATE bm_drafts SET input = ? WHERE id = ?')
    .run(JSON.stringify(input), id);

  return info.changes > 0;
}

export function updateDraftEntry(
  db: Database,
  id: number,
  entry: BmDraftEntry,
): boolean {
  const info = db
    .prepare(
      'UPDATE bm_drafts SET session_id = ?, kind = ?, input = ?, original_prompt = ? WHERE id = ?',
    )
    .run(
      entry.sessionId,
      entry.kind,
      JSON.stringify(entry.input),
      entry.originalPrompt,
      id,
    );

  return info.changes > 0;
}
