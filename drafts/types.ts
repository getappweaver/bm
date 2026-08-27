// ---------------------------------------------------------------------------
// plugins/bm/drafts/types.ts — bm draft entry shapes
// ---------------------------------------------------------------------------

import type { CreateBmDraft, UpdateBmInput } from '../types';

export type CreateDraftEntry = {
  sessionId: string;
  agentSessionId: string | null;
  kind: 'create';
  input: CreateBmDraft;
  originalPrompt: string;
};

export type UpdateDraftEntry = {
  sessionId: string;
  agentSessionId: string | null;
  kind: 'update';
  input: UpdateBmInput;
  originalPrompt: string;
};

export type DeleteDraftEntry = {
  sessionId: string;
  agentSessionId: string | null;
  kind: 'delete';
  input: { id: number };
  originalPrompt: string;
};

export type BmDraftEntry =
  CreateDraftEntry | UpdateDraftEntry | DeleteDraftEntry;

export type BmDraftRow = BmDraftEntry & {
  id: number;
  createdAt: number;
};
