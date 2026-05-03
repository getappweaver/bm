// ---------------------------------------------------------------------------
// plugins/bm/commands/search/search-session.ts — persisted published-search sessions
// ---------------------------------------------------------------------------

import type { Database } from 'bun:sqlite';

import {
  getBmSearchSessionMeta,
  getBmLastSearchSessionRow,
  listBmSearchSessionResultsByIds,
  listBmSearchSessionResultsPage,
  getBmSearchSessionRow,
  upsertBmSearchSession,
} from '../../db';

import type { BmSearchSession, SearchBookmarkEvent } from './search';

export type BmStoredSearchSession = BmSearchSession & {
  sessionId: string;
};

function createSearchSessionId(): string {
  return `bm-search-${Date.now()}-${crypto.randomUUID()}`;
}

export function createBmSearchSession(
  db: Database,
  session: BmSearchSession,
): BmStoredSearchSession {
  const storedSession: BmStoredSearchSession = {
    ...session,
    sessionId: createSearchSessionId(),
  };

  upsertBmSearchSession(db, storedSession);

  return storedSession;
}

export function getBmSearchSession(
  db: Database,
  sessionId: string,
): BmStoredSearchSession | null {
  return getBmSearchSessionRow(db, sessionId);
}

export function getBmLastSearchSession(
  db: Database,
): BmStoredSearchSession | null {
  return getBmLastSearchSessionRow(db);
}

export function updateBmSearchSessionPage(
  db: Database,
  session: BmStoredSearchSession,
  page: number,
): BmStoredSearchSession {
  const updatedSession: BmStoredSearchSession = {
    ...session,
    page,
  };

  upsertBmSearchSession(db, updatedSession);

  return updatedSession;
}

export function getBmSearchResultByDisplayIndex(
  index: number,
  session: BmStoredSearchSession | null,
): SearchBookmarkEvent | null {
  if (!session) {
    return null;
  }

  return session.results[index - 1] ?? null;
}

export function getBmSearchSessionPageResults(
  db: Database,
  sessionId: string,
  page: number,
): {
  session: Omit<BmStoredSearchSession, 'results'>;
  results: SearchBookmarkEvent[];
} | null {
  const session = getBmSearchSessionMeta(db, sessionId);

  if (!session) {
    return null;
  }

  return {
    session,
    results: listBmSearchSessionResultsPage(
      db,
      sessionId,
      page,
      session.pageSize,
    ),
  };
}

export function getBmSearchSessionResultsByIds(
  db: Database,
  sessionId: string,
  resultIds: number[],
): {
  session: Omit<BmStoredSearchSession, 'results'>;
  results: SearchBookmarkEvent[];
} | null {
  const session = getBmSearchSessionMeta(db, sessionId);

  if (!session) {
    return null;
  }

  return {
    session,
    results: listBmSearchSessionResultsByIds(db, sessionId, resultIds),
  };
}
