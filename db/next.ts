// ---------------------------------------------------------------------------
// plugins/bm/db/next.ts — !bm next
// ---------------------------------------------------------------------------

import type { Database } from 'bun:sqlite';

import type { Bm, BmListFilters } from '../types';

import { listBms } from './list-query';

type GetNextBmProps = {
  db: Database;
  mediaType: string | null;
  tags_all: string[] | null;
  category: string | null;
};

export type GetNextBmResult = {
  bm: Bm | null;
  /** True when the row came from the queued-only pass. */
  fromQueue: boolean;
};

/**
 * Oldest unconsumed bookmark matching filters, `created_at` ascending.
 * First pass: `in_queue` only. If empty, second pass: any queue state (still
 * unconsumed)—same idea as `listBmsWithQueueFallback` for AI list.
 */
export function getNextBm({
  db,
  mediaType,
  tags_all,
  category,
}: GetNextBmProps): GetNextBmResult {
  const base: BmListFilters = {
    tags_all,
    category,
    title_contains: null,
    url_contains: null,
    media_type: mediaType,
    media_types: null,
    in_queue: null,
    consumed: false,
  };

  const queuedFirst = listBms({
    db,
    filters: { ...base, in_queue: true },
    sortCreatedAt: 'asc',
  });

  if (queuedFirst.length > 0) {
    return { bm: queuedFirst[0]!, fromQueue: true };
  }

  const relaxed = listBms({
    db,
    filters: { ...base, in_queue: null },
    sortCreatedAt: 'asc',
  });

  const bm = relaxed[0] ?? null;

  return { bm, fromQueue: false };
}
