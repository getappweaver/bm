// ---------------------------------------------------------------------------
// plugins/bm/db.ts — bm_bookmarks + bm_tags / bm_categories registry tables
// ---------------------------------------------------------------------------
import { join } from 'path';

import { Database } from 'bun:sqlite';

import { createBmDraftsTable } from './drafts';
import type {
  Bm,
  BmListFilters,
  BmCategoryCount,
  BmTagCount,
  CreateBmInput,
  UpdateBmInput,
} from './types';
// ---------------------------------------------------------------------------
// Taxonomy cache (tag/category counts from SELECT tags, category only);
// invalidated on bookmark insert/update/delete
// ---------------------------------------------------------------------------

let taxonomyCacheGen = 0;
let taxonomyCache: {
  gen: number;
  tagCounts: BmTagCount[];
  categoryCounts: BmCategoryCount[];
} | null = null;

function invalidateBookmarkTaxonomyCache(): void {
  taxonomyCacheGen += 1;
  taxonomyCache = null;
}

type BmTaxonomyRow = {
  tags: string | null;
  category: string | null;
};

function loadTaxonomyRowsFromDatabase(db: Database): BmTaxonomyRow[] {
  return db
    .query('SELECT tags, category FROM bm_bookmarks')
    .all() as BmTaxonomyRow[];
}

function getCachedTaxonomySnapshot(db: Database): {
  tagCounts: BmTagCount[];
  categoryCounts: BmCategoryCount[];
} {
  if (taxonomyCache !== null && taxonomyCache.gen === taxonomyCacheGen) {
    return taxonomyCache;
  }

  const rows = loadTaxonomyRowsFromDatabase(db);

  const tagCounts = aggregateBmTagCounts(rows);
  const categoryCounts = aggregateBmCategoryCounts(rows);

  taxonomyCache = {
    gen: taxonomyCacheGen,
    tagCounts,
    categoryCounts,
  };

  return taxonomyCache;
}

function rowToBm(row: Record<string, unknown>): Bm {
  const rawToRead = row.to_read;

  return {
    id: Number(row.id),
    url: String(row.url),
    title: String(row.title),
    summary: row.summary != null ? String(row.summary) : null,
    description: row.description != null ? String(row.description) : null,
    category: row.category != null ? String(row.category) : null,
    tags: row.tags != null ? String(row.tags) : null,
    to_read: rawToRead != null ? Number(rawToRead) !== 0 : false,
    read_at: row.read_at != null ? Number(row.read_at) : null,
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
};

function listBmsFromDatabase({ db, filters }: ListBmsProps): Bm[] {
  const bind: Record<string, string | number | null> = {};
  const conditions: string[] = ['1 = 1'];

  if (filters.to_read !== null) {
    conditions.push('to_read = $toRead');
    bind.toRead = filters.to_read ? 1 : 0;
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

  const sql = `SELECT * FROM bm_bookmarks WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`;
  const rows = db.query(sql).all(bind) as Record<string, unknown>[];

  let items = rows.map(rowToBm);

  if (filters.tags_all !== null && filters.tags_all.length > 0) {
    items = items.filter((bm) =>
      bookmarkHasAllTags(bm.tags, filters.tags_all!),
    );
  }

  return items;
}

export function listBms({ db, filters }: ListBmsProps): Bm[] {
  return listBmsFromDatabase({ db, filters });
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

export function listBmTagCounts(db: Database): BmTagCount[] {
  return [...getCachedTaxonomySnapshot(db).tagCounts];
}

export function listBmCategoryCounts(db: Database): BmCategoryCount[] {
  return [...getCachedTaxonomySnapshot(db).categoryCounts];
}

export function createBmTable(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS bm_bookmarks (
      id          INTEGER PRIMARY KEY,
      url         TEXT    NOT NULL UNIQUE,
      title       TEXT    NOT NULL,
      summary     TEXT,
      description TEXT,
      category    TEXT,
      tags        TEXT,
      to_read     INTEGER NOT NULL DEFAULT 0,
      read_at     INTEGER,
      created_at  INTEGER NOT NULL
    )
  `);

  try {
    db.run(
      'ALTER TABLE bm_bookmarks ADD COLUMN to_read INTEGER NOT NULL DEFAULT 0',
    );
  } catch {
    /* column already present */
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS bm_tags (
      name      TEXT NOT NULL UNIQUE,
      use_count INTEGER NOT NULL DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS bm_categories (
      path      TEXT NOT NULL UNIQUE,
      use_count INTEGER NOT NULL DEFAULT 0
    )
  `);

  db.run(
    'CREATE INDEX IF NOT EXISTS idx_bm_bookmarks_category ON bm_bookmarks(category)',
  );

  db.run(
    'CREATE INDEX IF NOT EXISTS idx_bm_bookmarks_created_at ON bm_bookmarks(created_at DESC)',
  );

  db.run(
    'CREATE INDEX IF NOT EXISTS idx_bm_bookmarks_read_at ON bm_bookmarks(read_at)',
  );

  db.run(
    'CREATE INDEX IF NOT EXISTS idx_bm_bookmarks_to_read ON bm_bookmarks(to_read)',
  );
}

export function createBm(
  db: Database,
  input: CreateBmInput,
  _source?: string,
): Bm {
  const now = Date.now();

  const toRead = input.to_read === true ? 1 : 0;

  const info = db
    .query(
      `INSERT INTO bm_bookmarks (
         url, title, summary, description, category, tags, to_read, read_at, created_at
       )
       VALUES (
         $url, $title, $summary, $description, $category, $tags, $toRead, $readAt, $createdAt
       )`,
    )
    .run({
      url: input.url,
      title: input.title,
      summary: input.summary ?? null,
      description: input.description ?? null,
      category: input.category ?? null,
      tags: input.tags ?? null,
      toRead,
      readAt: null,
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
    input.category !== undefined ? input.category : existing.category;

  const tags = input.tags !== undefined ? input.tags : existing.tags;

  const read_at =
    input.read_at !== undefined ? input.read_at : existing.read_at;

  const to_read =
    input.to_read !== undefined
      ? input.to_read
        ? 1
        : 0
      : existing.to_read
        ? 1
        : 0;

  db.query(
    `UPDATE bm_bookmarks SET
       url = $url,
       title = $title,
       summary = $summary,
       description = $description,
       category = $category,
       tags = $tags,
       to_read = $toRead,
       read_at = $readAt
     WHERE id = $id`,
  ).run({
    url,
    title,
    summary,
    description,
    category,
    tags,
    toRead: to_read,
    readAt: read_at,
    id: input.id,
  });

  invalidateBookmarkTaxonomyCache();

  return getBm(db, input.id);
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
