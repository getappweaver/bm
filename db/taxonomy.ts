// ---------------------------------------------------------------------------
// plugins/bm/db/taxonomy.ts — tag/category/media_type counts cache
// ---------------------------------------------------------------------------

import type { Database } from 'bun:sqlite';

import type { BmCategoryCount, BmMediaTypeCount, BmTagCount } from '../types';
import { normalizeMediaTypeForCreate } from '../types';

import { parseTagTokens } from './tag-utils';

let taxonomyCacheGen = 0;
let taxonomyCache: {
  gen: number;
  tagCounts: BmTagCount[];
  categoryCounts: BmCategoryCount[];
  mediaTypeCounts: BmMediaTypeCount[];
} | null = null;

export function invalidateBookmarkTaxonomyCache(): void {
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
