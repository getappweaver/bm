// ---------------------------------------------------------------------------
// plugins/bm/drafts/index.ts — public drafts API
// ---------------------------------------------------------------------------

export type {
  BmDraftEntry,
  BmDraftRow,
  CreateDraftEntry,
  DeleteDraftEntry,
  UpdateDraftEntry,
} from './types';

export { createBmDraftsTable } from './tables';
export {
  createDraftSessionId,
  deleteDraft,
  getDraft,
  getDraftBySessionIndex,
  listDrafts,
  listDraftsBySession,
  storeDraft,
  updateDraftEntry,
  updateDraftInput,
} from './storage';
