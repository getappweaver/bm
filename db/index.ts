// ---------------------------------------------------------------------------
// plugins/bm/db/index.ts — public DB API (split modules in this folder)
// ---------------------------------------------------------------------------

export {
  aggregateBmCategoryCounts,
  aggregateBmMediaTypeCounts,
  aggregateBmTagCounts,
  listBmCategoryCounts,
  listBmMediaTypeCounts,
  listBmTagCounts,
} from './taxonomy';

export { listBms, listBmsWithQueueFallback } from './list-query';

export type { GetNextBmResult } from './next';
export { getNextBm } from './next';

export { createBmTable } from './tables';

export {
  createBm,
  deleteBm,
  getBm,
  getBmByUrl,
  markBmDone,
  markBmQueued,
  setBmPublishedNaddr,
  updateBm,
} from './bookmarks';

export {
  createBmSearchSessionsTable,
  deleteExpiredBmSearchSessions,
  getBmLastSearchSessionRow,
  getBmSearchSessionMeta,
  getBmSearchSessionRow,
  listBmSearchSessionResultsByIds,
  listBmSearchSessionResultsPage,
  updateBmSearchSessionPageRow,
  upsertBmSearchSession,
} from './search-sessions';

export { openDb } from './open';
