// ---------------------------------------------------------------------------
// plugins/bm/types/draft.ts — Draft payloads for create (!bm ai / OpenCode confirm)
//
// Stored shape matches normalized CreateBmInput (no null placeholders).
// ---------------------------------------------------------------------------

import type { CreateBmInput } from './bookmark';

export { CreateBmInputSchema as CreateBmDraftSchema } from './bookmark';

export type CreateBmDraft = CreateBmInput;
