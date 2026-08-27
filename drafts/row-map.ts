// ---------------------------------------------------------------------------
// plugins/bm/drafts/row-map.ts — SQLite row → BmDraftRow
// ---------------------------------------------------------------------------

import { assertUnreachable } from '@src/utils';

import {
  CreateBmInputSchema,
  normalizeCreateBmInput,
  type CreateBmDraft,
  type UpdateBmInput,
} from '../types';

import type { BmDraftEntry, BmDraftRow } from './types';

export function rowToDraft(row: Record<string, unknown>): BmDraftRow {
  const kind = String(row.kind) as BmDraftEntry['kind'];
  const input = JSON.parse(String(row.input));
  const originalPrompt = String(row.original_prompt);
  const id = Number(row.id);
  const sessionId = String(row.session_id ?? '');

  const agentSessionId =
    typeof row.agent_session_id === 'string' ? row.agent_session_id : null;

  const createdAt = Number(row.created_at);

  if (kind === 'create') {
    const parsed = CreateBmInputSchema.safeParse(input);

    const normalized: CreateBmDraft = parsed.success
      ? normalizeCreateBmInput(parsed.data)
      : (input as CreateBmDraft);

    return {
      id,
      sessionId,
      agentSessionId,
      createdAt,
      kind,
      input: normalized,
      originalPrompt,
    };
  }

  if (kind === 'update') {
    return {
      id,
      sessionId,
      agentSessionId,
      createdAt,
      kind,
      input: input as UpdateBmInput,
      originalPrompt,
    };
  }

  if (kind === 'delete') {
    return {
      id,
      sessionId,
      agentSessionId,
      createdAt,
      kind,
      input: input as { id: number },
      originalPrompt,
    };
  }

  return assertUnreachable(kind);
}
