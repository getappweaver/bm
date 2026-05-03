// ---------------------------------------------------------------------------
// plugins/bm/db/search-sessions.ts — persisted !bm search relay results
// ---------------------------------------------------------------------------

import type { Database } from 'bun:sqlite';

import type {
  BmStoredSearchSession,
  SearchBookmarkEvent,
} from '../commands/search';

const BM_SEARCH_SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function createBmSearchSessionsTable(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS bm_search_sessions (
      session_id TEXT PRIMARY KEY,
      raw_relay_count INTEGER NOT NULL DEFAULT 0,
      result_count INTEGER NOT NULL DEFAULT 0,
      wot_sorted INTEGER NOT NULL DEFAULT 0,
      page INTEGER NOT NULL,
      page_size INTEGER NOT NULL,
      filters_json TEXT NOT NULL,
      title_match_ids_json TEXT NOT NULL DEFAULT '[]',
      category_match_ids_json TEXT NOT NULL DEFAULT '[]',
      media_type_match_ids_json TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  db.run(
    'CREATE INDEX IF NOT EXISTS idx_bm_search_sessions_updated_at ON bm_search_sessions(updated_at)',
  );

  db.run(`
    CREATE TABLE IF NOT EXISTS bm_search_session_results (
      session_id TEXT NOT NULL,
      result_id INTEGER NOT NULL,
      event_id TEXT NOT NULL,
      pubkey TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      url TEXT,
      title TEXT,
      category TEXT,
      media_type TEXT,
      tags_json TEXT NOT NULL,
      content TEXT NOT NULL,
      wot_score REAL,
      PRIMARY KEY (session_id, result_id)
    )
  `);

  db.run(
    'CREATE INDEX IF NOT EXISTS idx_bm_search_session_results_session ON bm_search_session_results(session_id, result_id)',
  );
}

export function deleteExpiredBmSearchSessions(db: Database): void {
  const cutoff = Date.now() - BM_SEARCH_SESSION_MAX_AGE_MS;

  db.query(
    `DELETE FROM bm_search_session_results
     WHERE session_id IN (
       SELECT session_id FROM bm_search_sessions WHERE updated_at < $cutoff
     )`,
  ).run({ cutoff });

  db.query('DELETE FROM bm_search_sessions WHERE updated_at < $cutoff').run({
    cutoff,
  });
}

export function upsertBmSearchSession(
  db: Database,
  session: BmStoredSearchSession,
): void {
  deleteExpiredBmSearchSessions(db);

  const now = Date.now();

  db.query(
    `INSERT OR REPLACE INTO bm_search_sessions (
       session_id,
       raw_relay_count,
       result_count,
       wot_sorted,
       page,
       page_size,
       filters_json,
       title_match_ids_json,
       category_match_ids_json,
       media_type_match_ids_json,
       created_at,
       updated_at
     ) VALUES (
       $sessionId,
       $rawRelayCount,
       $resultCount,
       $wotSorted,
       $page,
       $pageSize,
       $filtersJson,
       $titleMatchIdsJson,
       $categoryMatchIdsJson,
       $mediaTypeMatchIdsJson,
       COALESCE((SELECT created_at FROM bm_search_sessions WHERE session_id = $sessionId), $createdAt),
       $updatedAt
     )`,
  ).run({
    sessionId: session.sessionId,
    rawRelayCount: session.rawRelayCount,
    resultCount: session.resultCount,
    wotSorted: session.wotSorted ? 1 : 0,
    page: session.page,
    pageSize: session.pageSize,
    filtersJson: JSON.stringify(session.filters),
    titleMatchIdsJson: JSON.stringify(session.titleMatchIds),
    categoryMatchIdsJson: JSON.stringify(session.categoryMatchIds),
    mediaTypeMatchIdsJson: JSON.stringify(session.mediaTypeMatchIds),
    createdAt: now,
    updatedAt: now,
  });

  db.query(
    'DELETE FROM bm_search_session_results WHERE session_id = $sessionId',
  ).run({
    sessionId: session.sessionId,
  });

  const insertResult = db.query(
    `INSERT INTO bm_search_session_results (
       session_id,
       result_id,
       event_id,
       pubkey,
       created_at,
       url,
       title,
       category,
       media_type,
       tags_json,
       content,
       wot_score
     ) VALUES (
       $sessionId,
       $resultId,
       $eventId,
       $pubkey,
       $createdAt,
       $url,
       $title,
       $category,
       $mediaType,
       $tagsJson,
       $content,
       $wotScore
     )`,
  );

  for (let i = 0; i < session.results.length; i += 1) {
    const result = session.results[i]!;

    insertResult.run({
      sessionId: session.sessionId,
      resultId: i + 1,
      eventId: result.id,
      pubkey: result.pubkey,
      createdAt: result.created_at,
      url: result.url,
      title: result.title,
      category: result.category,
      mediaType: result.media_type,
      tagsJson: JSON.stringify(result.tags),
      content: result.content,
      wotScore: result.wotScore,
    });
  }
}

export function getBmSearchSessionRow(
  db: Database,
  sessionId: string,
): BmStoredSearchSession | null {
  deleteExpiredBmSearchSessions(db);

  const row = db
    .query(
      `SELECT
         session_id,
         raw_relay_count,
         result_count,
         wot_sorted,
         page,
         page_size,
         filters_json,
         title_match_ids_json,
         category_match_ids_json,
         media_type_match_ids_json
       FROM bm_search_sessions
       WHERE session_id = $sessionId`,
    )
    .get({ sessionId }) as
    | {
        session_id: string;
        raw_relay_count: number;
        result_count: number;
        wot_sorted: number;
        page: number;
        page_size: number;
        filters_json: string;
        title_match_ids_json: string;
        category_match_ids_json: string;
        media_type_match_ids_json: string;
      }
    | undefined;

  if (!row) {
    return null;
  }

  const results = db
    .query(
      `SELECT result_id, event_id, pubkey, created_at, url, title, category, media_type, tags_json, content, wot_score
       FROM bm_search_session_results
       WHERE session_id = $sessionId
       ORDER BY result_id ASC`,
    )
    .all({ sessionId }) as Array<{
    result_id: number;
    event_id: string;
    pubkey: string;
    created_at: number;
    url: string | null;
    title: string | null;
    category: string | null;
    media_type: string | null;
    tags_json: string;
    content: string;
    wot_score: number | null;
  }>;

  return {
    sessionId: row.session_id,
    rawRelayCount: Number(row.raw_relay_count),
    resultCount: Number(row.result_count),
    wotSorted: Number(row.wot_sorted) !== 0,
    page: Number(row.page),
    pageSize: Number(row.page_size),
    filters: JSON.parse(row.filters_json),
    titleMatchIds: JSON.parse(row.title_match_ids_json) as number[],
    categoryMatchIds: JSON.parse(row.category_match_ids_json) as number[],
    mediaTypeMatchIds: JSON.parse(row.media_type_match_ids_json) as number[],
    results: results.map((result) => ({
      id: result.event_id,
      pubkey: result.pubkey,
      created_at: Number(result.created_at),
      url: result.url,
      title: result.title,
      category: result.category,
      media_type: result.media_type,
      tags: JSON.parse(result.tags_json) as string[],
      wotScore: result.wot_score == null ? null : Number(result.wot_score),
      content: result.content,
    })),
  };
}

export function getBmSearchSessionMeta(
  db: Database,
  sessionId: string,
): Omit<BmStoredSearchSession, 'results'> | null {
  deleteExpiredBmSearchSessions(db);

  const row = db
    .query(
      `SELECT
         session_id,
         raw_relay_count,
         result_count,
         wot_sorted,
         page,
         page_size,
         filters_json,
         title_match_ids_json,
         category_match_ids_json,
         media_type_match_ids_json
       FROM bm_search_sessions
       WHERE session_id = $sessionId`,
    )
    .get({ sessionId }) as
    | {
        session_id: string;
        raw_relay_count: number;
        result_count: number;
        wot_sorted: number;
        page: number;
        page_size: number;
        filters_json: string;
        title_match_ids_json: string;
        category_match_ids_json: string;
        media_type_match_ids_json: string;
      }
    | undefined;

  if (!row) {
    return null;
  }

  return {
    sessionId: row.session_id,
    rawRelayCount: Number(row.raw_relay_count),
    resultCount: Number(row.result_count),
    wotSorted: Number(row.wot_sorted) !== 0,
    page: Number(row.page),
    pageSize: Number(row.page_size),
    filters: JSON.parse(row.filters_json),
    titleMatchIds: JSON.parse(row.title_match_ids_json) as number[],
    categoryMatchIds: JSON.parse(row.category_match_ids_json) as number[],
    mediaTypeMatchIds: JSON.parse(row.media_type_match_ids_json) as number[],
  };
}

export function listBmSearchSessionResultsPage(
  db: Database,
  sessionId: string,
  page: number,
  pageSize: number,
): SearchBookmarkEvent[] {
  deleteExpiredBmSearchSessions(db);

  const offset = Math.max(page - 1, 0) * pageSize;

  const rows = db
    .query(
      `SELECT event_id, pubkey, created_at, url, title, category, media_type, tags_json, content, wot_score
       FROM bm_search_session_results
       WHERE session_id = $sessionId
       ORDER BY result_id ASC
       LIMIT $limit OFFSET $offset`,
    )
    .all({ sessionId, limit: pageSize, offset }) as Array<{
    event_id: string;
    pubkey: string;
    created_at: number;
    url: string | null;
    title: string | null;
    category: string | null;
    media_type: string | null;
    tags_json: string;
    content: string;
    wot_score: number | null;
  }>;

  return rows.map((result) => ({
    id: result.event_id,
    pubkey: result.pubkey,
    created_at: Number(result.created_at),
    url: result.url,
    title: result.title,
    category: result.category,
    media_type: result.media_type,
    tags: JSON.parse(result.tags_json) as string[],
    wotScore: result.wot_score == null ? null : Number(result.wot_score),
    content: result.content,
  }));
}

export function listBmSearchSessionResultsByIds(
  db: Database,
  sessionId: string,
  resultIds: number[],
): SearchBookmarkEvent[] {
  deleteExpiredBmSearchSessions(db);

  if (resultIds.length === 0) {
    return [];
  }

  const placeholders = resultIds.map(() => '?').join(', ');

  const rows = db
    .query(
      `SELECT result_id, event_id, pubkey, created_at, url, title, category, media_type, tags_json, content, wot_score
       FROM bm_search_session_results
       WHERE session_id = ? AND result_id IN (${placeholders})
       ORDER BY result_id ASC`,
    )
    .all(sessionId, ...resultIds) as Array<{
    result_id: number;
    event_id: string;
    pubkey: string;
    created_at: number;
    url: string | null;
    title: string | null;
    category: string | null;
    media_type: string | null;
    tags_json: string;
    content: string;
    wot_score: number | null;
  }>;

  return rows.map((result) => ({
    id: result.event_id,
    pubkey: result.pubkey,
    created_at: Number(result.created_at),
    url: result.url,
    title: result.title,
    category: result.category,
    media_type: result.media_type,
    tags: JSON.parse(result.tags_json) as string[],
    wotScore: result.wot_score == null ? null : Number(result.wot_score),
    content: result.content,
  }));
}

export function getBmLastSearchSessionRow(
  db: Database,
): BmStoredSearchSession | null {
  deleteExpiredBmSearchSessions(db);

  const row = db
    .query(
      `SELECT session_id
       FROM bm_search_sessions
       ORDER BY updated_at DESC
       LIMIT 1`,
    )
    .get() as { session_id: string } | undefined;

  if (!row) {
    return null;
  }

  return getBmSearchSessionRow(db, row.session_id);
}
