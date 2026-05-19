// ---------------------------------------------------------------------------
// plugins/bm/commands/ai/tool-helpers.ts — shared formatting + filter helpers for AI + executeTool
// ---------------------------------------------------------------------------

import { nip19 } from 'nostr-tools';
import type { SimplePool } from 'nostr-tools/pool';
import type { z } from 'zod';

import { fetchNip65WriteRelays } from '@src/nostr/nip65';
import { normalizePubkeyInput } from '@src/nostr/wot';

import { formatBmDetail } from '../../format';
import type { CreateBmInputSchema } from '../../types';
import {
  type Bm,
  type BmListFilters,
  type ImportBmInput,
  normalizeBmListFilters,
  normalizeMediaTypeFilter,
} from '../../types';

import type { BmStoredSearchSession, SearchBookmarkEvent } from '../search';

import type { BmListCall } from './schemas';
import type { BmPublishedSearchCallSchema } from './schemas';

export function normalizePublishedSearchFilters(
  call: z.infer<typeof BmPublishedSearchCallSchema>,
): {
  title: string | null;
  tags_any: string[];
  category: string | null;
  media_type: string | null;
  limit: number;
  relays: string[];
} {
  return {
    title: call.title ?? null,
    tags_any:
      call.tags_any?.map((tag) => tag.trim().toLowerCase()).filter(Boolean) ??
      [],
    category: call.category ?? null,
    media_type:
      call.media_type !== undefined && call.media_type !== null
        ? normalizeMediaTypeFilter(call.media_type)
        : null,
    limit: 200,
    relays: [],
  };
}

export function buildRawBookmarkInputFromSearchResult(result: {
  id: string;
  pubkey: string;
  url: string | null;
  title: string | null;
  category: string | null;
  media_type: string | null;
  tags: string[];
  content: string;
}): z.input<typeof CreateBmInputSchema> {
  return {
    url: result.url ?? `nostr:${result.id}`,
    title: result.title?.trim() || `Bookmark from ${result.pubkey}`,
    summary: null,
    description: result.content.trim() || null,
    category: result.category?.trim() || 'imported/nostr',
    tags: result.tags.length > 0 ? result.tags.join(', ') : 'nostr',
    media_type: result.media_type?.trim() || 'read',
    in_queue: false,
  };
}

function getBookmarkIdentifierFromUrl(url: string): string {
  return url.replace(/^https?:\/\//i, '');
}

export async function buildImportedPublishedMeta(props: {
  result: SearchBookmarkEvent;
  pool: SimplePool;
  masterPubkey: string;
}): Promise<Pick<ImportBmInput, 'nostr_naddr' | 'published_at'>> {
  const { result, pool, masterPubkey } = props;

  if (!result.url) {
    return {
      nostr_naddr: undefined,
      published_at: result.created_at * 1000,
    };
  }

  const relays = await fetchNip65WriteRelays({
    pool,
    authorPubkey: normalizePubkeyInput(masterPubkey),
  });

  return {
    nostr_naddr: nip19.naddrEncode({
      kind: 39701,
      pubkey: result.pubkey,
      identifier: getBookmarkIdentifierFromUrl(result.url),
      relays,
    }),
    published_at: result.created_at * 1000,
  };
}

export function publishedSearchNavigationHint(sessionId: string): string {
  return [
    `Use \`bun src/cli.ts bm published_search_page '{"session_id":"${sessionId}","page":1}'\``,
    `then \`bun src/cli.ts bm published_search_page '{"session_id":"${sessionId}","direction":"next"}'\``,
    'and use `create_from_published_search` to create a draft from a result.',
  ].join(' ');
}

function formatMatchIds(ids: number[]): string {
  return ids.length > 0 ? ids.join(', ') : 'none';
}

export function formatPublishedSearchSummary(props: {
  sessionId: string;
  session: Omit<BmStoredSearchSession, 'results'>;
}): string {
  const { sessionId, session } = props;
  const matchLines = [];

  if (session.filters.title) {
    matchLines.push(`Title matches: ${formatMatchIds(session.titleMatchIds)}`);
  }

  if (session.filters.category) {
    matchLines.push(
      `Category matches: ${formatMatchIds(session.categoryMatchIds)}`,
    );
  }

  if (session.filters.media_type) {
    matchLines.push(
      `Media matches: ${formatMatchIds(session.mediaTypeMatchIds)}`,
    );
  }

  return [
    `Session: ${sessionId}`,
    `Raw relay count: ${session.rawRelayCount}`,
    `Result count: ${session.resultCount}`,
    `WoT sorted: ${session.wotSorted ? 'yes' : 'no'}`,
    ...matchLines,
    '',
    publishedSearchNavigationHint(sessionId),
    `Use \`bun src/cli.ts bm published_search_results '{"session_id":"${sessionId}","result_ids":[1,2,3]}'\` to fetch selected results.`,
  ].join('\n');
}

export function formatPublishedSearchResults(props: {
  sessionId: string;
  pageSize: number;
  page?: number;
  results: SearchBookmarkEvent[];
}): string {
  const { sessionId, page, pageSize, results } = props;

  if (results.length === 0) {
    return `No published search results found in session ${sessionId}.`;
  }

  const startIndex = page ? (page - 1) * pageSize : 0;

  return [
    `Session: ${sessionId}${page ? ` · Page ${page}` : ''}`,
    '',
    ...results.map((item, index) =>
      [
        `${startIndex + index + 1}. ${item.title ?? '(untitled bookmark)'}`,
        `URL: ${item.url ?? '—'}`,
        `WoT: ${item.wotScore == null ? 'n/a' : item.wotScore.toFixed(2)}`,
        `Tags: ${item.tags.join(', ') || '—'}`,
      ].join('\n'),
    ),
    '',
    `Use \`bun src/cli.ts bm published_search_page '{"session_id":"${sessionId}","direction":"next"}'\` for the next page, \`direction":"prev"\` for the previous page, or \`create_from_published_search\` to draft a result.`,
  ].join('\n\n');
}

export function formatExistingBookmarkDuplicate(props: {
  existing: Bm;
  resultId: number;
}): string {
  const { existing, resultId } = props;

  return [
    `Published search result ${resultId} already exists locally as #${existing.id}.`,
    '',
    formatBmDetail(existing),
  ].join('\n');
}

export function bmListCallToFilters(call: BmListCall): BmListFilters {
  const mediaTypeNorm =
    call.media_type !== undefined && call.media_type !== null
      ? normalizeMediaTypeFilter(call.media_type)
      : undefined;

  return normalizeBmListFilters({
    tags_all: call.tags_all,
    category: call.category ?? undefined,
    title_contains: call.title_contains ?? undefined,
    url_contains: call.url_contains ?? undefined,
    in_queue: call.in_queue,
    consumed: call.consumed,
    media_type: mediaTypeNorm ?? undefined,
  });
}
