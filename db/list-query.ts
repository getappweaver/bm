// ---------------------------------------------------------------------------
// plugins/bm/db/list-query.ts — filtered list queries
// ---------------------------------------------------------------------------

import type { Database } from 'bun:sqlite';

import type { Bm, BmListFilters } from '../types';
import { normalizeMediaTypeFilter } from '../types';

import { rowToBm } from './row-map';
import { parseTagTokens } from './tag-utils';

function escapeSqlLikeFragment(fragment: string): string {
  return fragment
    .replaceAll('\\', '\\\\')
    .replaceAll('%', '\\%')
    .replaceAll('_', '\\_');
}

function bookmarkHasAllTags(
  tagsField: string | null,
  required: string[],
): boolean {
  if (required.length === 0) {
    return true;
  }

  const have = parseTagTokens(tagsField);

  return required.every((r) => have.has(r.trim().toLowerCase()));
}

type ListBmsProps = {
  db: Database;
  filters: BmListFilters;
  sortCreatedAt: 'asc' | 'desc';
};

function listBmsFromDatabase({
  db,
  filters,
  sortCreatedAt,
}: ListBmsProps): Bm[] {
  const bind: Record<string, string | number | null> = {};
  const conditions: string[] = ['1 = 1'];

  if (filters.in_queue !== null) {
    conditions.push('in_queue = $inQueue');
    bind.inQueue = filters.in_queue ? 1 : 0;
  }

  if (filters.consumed !== null) {
    if (filters.consumed) {
      conditions.push('consumed_at IS NOT NULL');
    } else {
      conditions.push('consumed_at IS NULL');
    }
  }

  if (filters.media_type !== null) {
    const mt = normalizeMediaTypeFilter(filters.media_type);

    if (mt != null) {
      conditions.push('media_type = $mediaType');
      bind.mediaType = mt;
    }
  }

  if (filters.category !== null) {
    const raw = filters.category.trim();
    const esc = escapeSqlLikeFragment(raw);

    conditions.push(`(
      category = $category OR
      category LIKE $categorySubtree ESCAPE '\\' OR
      category LIKE $categoryAfterSlash ESCAPE '\\' OR
      category LIKE $categoryEndsSegment ESCAPE '\\'
    )`);

    bind.category = raw;
    bind.categorySubtree = `${esc}/%`;
    bind.categoryAfterSlash = `%/${esc}/%`;
    bind.categoryEndsSegment = `%/${esc}`;
  }

  if (filters.title_contains !== null) {
    const esc = escapeSqlLikeFragment(filters.title_contains);

    conditions.push("title LIKE $titleContains ESCAPE '\\'");
    bind.titleContains = `%${esc}%`;
  }

  if (filters.url_contains !== null) {
    const esc = escapeSqlLikeFragment(filters.url_contains);

    conditions.push("url LIKE $urlContains ESCAPE '\\'");
    bind.urlContains = `%${esc}%`;
  }

  const order = sortCreatedAt === 'asc' ? 'ASC' : 'DESC';
  const sql = `SELECT * FROM bm_bookmarks WHERE ${conditions.join(' AND ')} ORDER BY created_at ${order}`;
  const rows = db.query(sql).all(bind) as Record<string, unknown>[];

  let items = rows.map(rowToBm);

  if (filters.tags_all !== null && filters.tags_all.length > 0) {
    items = items.filter((bm) =>
      bookmarkHasAllTags(bm.tags, filters.tags_all!),
    );
  }

  return items;
}

type ListBmsPublicProps = {
  db: Database;
  filters: BmListFilters;
  sortCreatedAt?: 'asc' | 'desc';
};

export function listBms({
  db,
  filters,
  sortCreatedAt = 'desc',
}: ListBmsPublicProps): Bm[] {
  return listBmsFromDatabase({ db, filters, sortCreatedAt });
}

type ListBmsWithQueueFallbackProps = {
  db: Database;
  filters: BmListFilters;
};

/**
 * AI list helper: prefer queued items first, then the same filters without
 * requiring queue when the first pass is empty. Skips when `in_queue` is
 * explicitly false (only non-queue). For `in_queue` null + `consumed` false,
 * tries queue first then falls back to all unconsumed matching filters.
 */
export function listBmsWithQueueFallback({
  db,
  filters,
}: ListBmsWithQueueFallbackProps): {
  items: Bm[];
  expandedFromQueue: boolean;
} {
  if (filters.in_queue === false) {
    return {
      items: listBms({ db, filters }),
      expandedFromQueue: false,
    };
  }

  if (filters.in_queue === true) {
    const first = listBms({ db, filters });

    if (first.length > 0) {
      return { items: first, expandedFromQueue: false };
    }

    const relaxed: BmListFilters = { ...filters, in_queue: null };
    const second = listBms({ db, filters: relaxed });

    return {
      items: second,
      expandedFromQueue: second.length > 0,
    };
  }

  if (filters.in_queue === null && filters.consumed === false) {
    const queuedFirst: BmListFilters = { ...filters, in_queue: true };
    const first = listBms({ db, filters: queuedFirst });

    if (first.length > 0) {
      return { items: first, expandedFromQueue: false };
    }

    const second = listBms({ db, filters });

    return {
      items: second,
      expandedFromQueue: second.length > 0,
    };
  }

  return {
    items: listBms({ db, filters }),
    expandedFromQueue: false,
  };
}
