// ---------------------------------------------------------------------------
// plugins/bm/drafts.ts — Draft store for the bm plugin
//
// Used when the agent (or !bm ai) proposes a change and the user
// must accept/revise/decline. If you don't need draft/confirm, you can
// simplify commands and opencode to apply changes directly and remove or
// stub draft usage here.
//
// Replace CreateBmDraft / UpdateBmInput with your
// types from types.ts so draft entries type-check.
// ---------------------------------------------------------------------------
import type { Database } from 'bun:sqlite';

import { assertUnreachable } from '@src/utils';

import type { CreateBmDraft, UpdateBmInput } from './types';

export type CreateDraftEntry = {
  kind: 'create';
  input: CreateBmDraft;
  originalPrompt: string;
};

export type UpdateDraftEntry = {
  kind: 'update';
  input: UpdateBmInput;
  originalPrompt: string;
};

export type DeleteDraftEntry = {
  kind: 'delete';
  input: { id: number };
  originalPrompt: string;
};

export type BmDraftEntry =
  | CreateDraftEntry
  | UpdateDraftEntry
  | DeleteDraftEntry;

export type BmDraftRow = BmDraftEntry & { id: number };

export function createBmDraftsTable(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS bm_drafts (
      id              INTEGER PRIMARY KEY,
      kind            TEXT NOT NULL,
      input           TEXT NOT NULL,
      original_prompt TEXT NOT NULL DEFAULT '',
      created_at      INTEGER NOT NULL
    )
  `);
}

export function storeDraft(db: Database, entry: BmDraftEntry): number {
  const now = Date.now();

  const info = db.run(
    `INSERT INTO bm_drafts (kind, input, original_prompt, created_at) VALUES (?, ?, ?, ?)`,
    [entry.kind, JSON.stringify(entry.input), entry.originalPrompt, now],
  );

  return Number(info.lastInsertRowid);
}

export function getDraft(db: Database, id: number): BmDraftRow | null {
  const row = db.prepare('SELECT * FROM bm_drafts WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;

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

function rowToDraft(row: Record<string, unknown>): BmDraftRow {
  const kind = String(row.kind) as BmDraftEntry['kind'];
  const input = JSON.parse(String(row.input));
  const originalPrompt = String(row.original_prompt);
  const id = Number(row.id);

  if (kind === 'create') {
    return { id, kind, input: input as CreateBmDraft, originalPrompt };
  }

  if (kind === 'update') {
    return { id, kind, input: input as UpdateBmInput, originalPrompt };
  }

  if (kind === 'delete') {
    return { id, kind, input: input as { id: number }, originalPrompt };
  }

  return assertUnreachable(kind);
}
