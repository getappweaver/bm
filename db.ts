// ---------------------------------------------------------------------------
// plugins/bm/db.ts — bm_bookmarks
// ---------------------------------------------------------------------------
import { join } from 'path';

import { Database } from 'bun:sqlite';

import { createBmDraftsTable } from './drafts';
import type {
  Bm,
  BmListFilters,
  BmCategoryCount,
  BmMediaTypeCount,
  BmTagCount,
  CreateBmInput,
  UpdateBmInput,
} from './types';
import {
  normalizeCategoryForCreate,
  normalizeMediaTypeFilter,
  normalizeMediaTypeForCreate,
  normalizeTagsForCreate,
} from './types';

// ---------------------------------------------------------------------------
// Taxonomy cache (tags, category, media_type counts);
// invalidated on bookmark insert/update/delete
// ---------------------------------------------------------------------------

let taxonomyCacheGen = 0;
let taxonomyCache: {
  gen: number;
  tagCounts: BmTagCount[];
  categoryCounts: BmCategoryCount[];
  mediaTypeCounts: BmMediaTypeCount[];
} | null = null;

function invalidateBookmarkTaxonomyCache(): void {
  taxonomyCacheGen += 1;
  taxonomyCache = null;
}

type BmTaxonomyRow = {
  tags: string | null;
  category: string | null;
  media_type: string | null;
};

function loadTaxonomyRowsFromDatabase(db: Database): BmTaxonomyRow[] {
  return db
    .query('SELECT tags, category, media_type FROM bm_bookmarks')
    .all() as BmTaxonomyRow[];
}

function getCachedTaxonomySnapshot(db: Database): {
  tagCounts: BmTagCount[];
  categoryCounts: BmCategoryCount[];
  mediaTypeCounts: BmMediaTypeCount[];
} {
  if (taxonomyCache !== null && taxonomyCache.gen === taxonomyCacheGen) {
    return taxonomyCache;
  }

  const rows = loadTaxonomyRowsFromDatabase(db);

  const tagCounts = aggregateBmTagCounts(rows);
  const categoryCounts = aggregateBmCategoryCounts(rows);
  const mediaTypeCounts = aggregateBmMediaTypeCounts(rows);

  taxonomyCache = {
    gen: taxonomyCacheGen,
    tagCounts,
    categoryCounts,
    mediaTypeCounts,
  };

  return taxonomyCache;
}

function rowToBm(row: Record<string, unknown>): Bm {
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
  };
}

function escapeSqlLikeFragment(fragment: string): string {
  return fragment
    .replaceAll('\\', '\\\\')
    .replaceAll('%', '\\%')
    .replaceAll('_', '\\_');
}

function parseTagTokens(tags: string | null): Set<string> {
  const set = new Set<string>();

  if (!tags) {
    return set;
  }

  for (const raw of tags.split(',')) {
    const t = raw.trim().toLowerCase();

    if (t) {
      set.add(t);
    }
  }

  return set;
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

export function aggregateBmTagCounts(
  items: { tags: string | null }[],
): BmTagCount[] {
  const map = new Map<string, number>();

  for (const bm of items) {
    for (const t of parseTagTokens(bm.tags)) {
      map.set(t, (map.get(t) ?? 0) + 1);
    }
  }

  return [...map.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag));
}

export function aggregateBmCategoryCounts(
  items: { category: string | null }[],
): BmCategoryCount[] {
  const map = new Map<string, number>();

  for (const bm of items) {
    if (!bm.category) {
      continue;
    }

    const c = bm.category.trim();

    if (c) {
      map.set(c, (map.get(c) ?? 0) + 1);
    }
  }

  return [...map.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

export function aggregateBmMediaTypeCounts(
  items: { media_type: string | null }[],
): BmMediaTypeCount[] {
  const map = new Map<string, number>();

  for (const bm of items) {
    if (bm.media_type == null) {
      continue;
    }

    const m = normalizeMediaTypeForCreate(String(bm.media_type));

    map.set(m, (map.get(m) ?? 0) + 1);
  }

  return [...map.entries()]
    .map(([media_type, count]) => ({ media_type, count }))
    .sort((a, b) => a.media_type.localeCompare(b.media_type));
}

export function listBmTagCounts(db: Database): BmTagCount[] {
  return [...getCachedTaxonomySnapshot(db).tagCounts];
}

export function listBmCategoryCounts(db: Database): BmCategoryCount[] {
  return [...getCachedTaxonomySnapshot(db).categoryCounts];
}

export function listBmMediaTypeCounts(db: Database): BmMediaTypeCount[] {
  return [...getCachedTaxonomySnapshot(db).mediaTypeCounts];
}

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

export function createBmTable(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS bm_bookmarks (
      id          INTEGER PRIMARY KEY,
      url         TEXT    NOT NULL UNIQUE,
      title       TEXT    NOT NULL,
      summary     TEXT,
      description TEXT,
      category    TEXT    NOT NULL,
      tags        TEXT    NOT NULL,
      media_type  TEXT    NOT NULL,
      in_queue    INTEGER NOT NULL,
      consumed_at INTEGER,
      created_at  INTEGER NOT NULL
    )
  `);

  db.run(
    'CREATE INDEX IF NOT EXISTS idx_bm_bookmarks_category ON bm_bookmarks(category)',
  );

  db.run(
    'CREATE INDEX IF NOT EXISTS idx_bm_bookmarks_created_at ON bm_bookmarks(created_at DESC)',
  );

  db.run(
    'CREATE INDEX IF NOT EXISTS idx_bm_bookmarks_in_queue ON bm_bookmarks(in_queue)',
  );

  db.run(
    'CREATE INDEX IF NOT EXISTS idx_bm_bookmarks_consumed_at ON bm_bookmarks(consumed_at)',
  );

  db.run(
    'CREATE INDEX IF NOT EXISTS idx_bm_bookmarks_media_type ON bm_bookmarks(media_type)',
  );
}

export function createBm(
  db: Database,
  input: CreateBmInput,
  _source?: string,
): Bm {
  const now = Date.now();

  const inQueue = input.in_queue ? 1 : 0;
  const mt = normalizeMediaTypeForCreate(input.media_type);

  const info = db
    .query(
      `INSERT INTO bm_bookmarks (
         url, title, summary, description, category, tags, media_type, in_queue, consumed_at, created_at
       )
       VALUES (
         $url, $title, $summary, $description, $category, $tags, $mediaType, $inQueue, $consumedAt, $createdAt
       )`,
    )
    .run({
      url: input.url,
      title: input.title,
      summary: input.summary ?? null,
      description: input.description ?? null,
      category: input.category,
      tags: input.tags,
      mediaType: mt,
      inQueue,
      consumedAt: null,
      createdAt: now,
    });

  const id = Number(info.lastInsertRowid);

  invalidateBookmarkTaxonomyCache();

  return getBm(db, id)!;
}

export function getBm(db: Database, id: number): Bm | null {
  const row = db
    .query('SELECT * FROM bm_bookmarks WHERE id = $id')
    .get({ id }) as Record<string, unknown> | undefined;

  return row ? rowToBm(row) : null;
}

export function getBmByUrl(db: Database, url: string): Bm | null {
  const row = db
    .query('SELECT * FROM bm_bookmarks WHERE url = $url')
    .get({ url }) as Record<string, unknown> | undefined;

  return row ? rowToBm(row) : null;
}

export function updateBm(db: Database, input: UpdateBmInput): Bm | null {
  const existing = getBm(db, input.id);

  if (!existing) {
    return null;
  }

  const url = input.url ?? existing.url;
  const title = input.title ?? existing.title;

  const summary =
    input.summary !== undefined ? input.summary : existing.summary;

  const description =
    input.description !== undefined ? input.description : existing.description;

  const category =
    input.category !== undefined
      ? normalizeCategoryForCreate(input.category)
      : existing.category;

  const tags =
    input.tags !== undefined
      ? normalizeTagsForCreate(input.tags)
      : existing.tags;

  const consumed_at =
    input.consumed_at !== undefined ? input.consumed_at : existing.consumed_at;

  const in_queue =
    input.in_queue !== undefined
      ? input.in_queue
        ? 1
        : 0
      : existing.in_queue
        ? 1
        : 0;

  const media_type =
    input.media_type !== undefined
      ? normalizeMediaTypeForCreate(input.media_type)
      : existing.media_type;

  db.query(
    `UPDATE bm_bookmarks SET
       url = $url,
       title = $title,
       summary = $summary,
       description = $description,
       category = $category,
       tags = $tags,
       media_type = $mediaType,
       in_queue = $inQueue,
       consumed_at = $consumedAt
     WHERE id = $id`,
  ).run({
    url,
    title,
    summary,
    description,
    category,
    tags,
    mediaType: media_type,
    inQueue: in_queue,
    consumedAt: consumed_at,
    id: input.id,
  });

  invalidateBookmarkTaxonomyCache();

  return getBm(db, input.id);
}

type MarkBmDoneProps = {
  db: Database;
  id: number;
};

/** Sets consumed_at = now and clears backlog flag. */
export function markBmDone({ db, id }: MarkBmDoneProps): Bm | null {
  const existing = getBm(db, id);

  if (!existing) {
    return null;
  }

  return updateBm(db, {
    id,
    consumed_at: Date.now(),
    in_queue: false,
  });
}

type MarkBmQueuedProps = {
  db: Database;
  id: number;
};

export function markBmQueued({ db, id }: MarkBmQueuedProps): Bm | null {
  const existing = getBm(db, id);

  if (!existing) {
    return null;
  }

  return updateBm(db, {
    id,
    in_queue: true,
  });
}

export function deleteBm(db: Database, id: number): boolean {
  const info = db.query('DELETE FROM bm_bookmarks WHERE id = $id').run({ id });

  if (info.changes > 0) {
    invalidateBookmarkTaxonomyCache();
  }

  return info.changes > 0;
}

// ---------------------------------------------------------------------------
// DB opener (single source of truth for CLI + plugins)
// ---------------------------------------------------------------------------

export function openDb(): Database {
  const db = new Database(join(import.meta.dir, 'db.sqlite'), { strict: true });
  db.run('PRAGMA foreign_keys = ON');
  db.run('PRAGMA journal_mode=WAL');
  createBmTable(db);
  createBmDraftsTable(db);

  return db;
}
