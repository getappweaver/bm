// ---------------------------------------------------------------------------
// plugins/bm/db/row-map.ts — SQLite row → Bm
// ---------------------------------------------------------------------------

import type { Bm } from '../types';
import {
  normalizeCategoryForCreate,
  normalizeMediaTypeForCreate,
  normalizeTagsForCreate,
} from '../types';

export function rowToBm(row: Record<string, unknown>): Bm {
  const rawInQueue = row.in_queue;

  return {
    id: Number(row.id),
    url: String(row.url),
    title: String(row.title),
    summary: row.summary != null ? String(row.summary) : null,
    description: row.description != null ? String(row.description) : null,
    category: normalizeCategoryForCreate(String(row.category)),
    tags: normalizeTagsForCreate(String(row.tags)),
    media_type: normalizeMediaTypeForCreate(String(row.media_type)),
    in_queue: rawInQueue != null ? Number(rawInQueue) !== 0 : false,
    consumed_at: row.consumed_at != null ? Number(row.consumed_at) : null,
    created_at: Number(row.created_at),
    nostr_naddr: row.nostr_naddr != null ? String(row.nostr_naddr) : null,
    published_at: row.published_at != null ? Number(row.published_at) : null,
  };
}
