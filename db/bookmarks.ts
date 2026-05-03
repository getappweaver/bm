// ---------------------------------------------------------------------------
// plugins/bm/db/bookmarks.ts — bm_bookmarks CRUD
// ---------------------------------------------------------------------------

import type { Database } from 'bun:sqlite';

import type { Bm, CreateBmInput, ImportBmInput, UpdateBmInput } from '../types';
import {
  normalizeCategoryForCreate,
  normalizeMediaTypeForCreate,
  normalizeTagsForCreate,
} from '../types';

import { rowToBm } from './row-map';
import { invalidateBookmarkTaxonomyCache } from './taxonomy';

export function createBm(
  db: Database,
  input: CreateBmInput | ImportBmInput,
  _source?: string,
): Bm {
  const now = Date.now();

  const inQueue = input.in_queue ? 1 : 0;
  const mt = normalizeMediaTypeForCreate(input.media_type);

  const nostrNaddr =
    'nostr_naddr' in input ? (input.nostr_naddr ?? null) : null;

  const publishedAt =
    'published_at' in input ? (input.published_at ?? null) : null;

  const info = db
    .query(
      `INSERT INTO bm_bookmarks (
         url, title, summary, description, category, tags, media_type, in_queue, consumed_at, created_at, nostr_naddr, published_at
       )
       VALUES (
         $url, $title, $summary, $description, $category, $tags, $mediaType, $inQueue, $consumedAt, $createdAt, $nostrNaddr, $publishedAt
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
      nostrNaddr,
      publishedAt,
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

export function setBmPublishedNaddr(props: {
  db: Database;
  id: number;
  nostrNaddr: string;
  publishedAt: number;
}): Bm | null {
  const { db, id, nostrNaddr, publishedAt } = props;

  db.query(
    `UPDATE bm_bookmarks
     SET nostr_naddr = $nostrNaddr,
         published_at = $publishedAt
     WHERE id = $id`,
  ).run({
    id,
    nostrNaddr,
    publishedAt,
  });

  return getBm(db, id);
}
