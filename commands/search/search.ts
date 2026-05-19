// ---------------------------------------------------------------------------
// plugins/bm/commands/search/search.ts — published bookmark relay search
// ---------------------------------------------------------------------------
import type { Filter, NostrEvent } from 'nostr-tools';

import type { PluginContext } from '@src/core/plugin';
import { debug } from '@src/logger';
import { fetchNip65WriteRelays } from '@src/nostr/nip65';
import { queryNostrWithNode } from '@src/nostr/node-query';
import { normalizePubkeyInput } from '@src/nostr/wot';

import { getBmNip50RelaySupport } from './nip50';
import type { BmSearchFilters } from './search-args';

const BM_BOOKMARK_KIND = 39701;
export const BM_SEARCH_PAGE_SIZE = 20;

export function formatBmSearchNavigationHint(
  commandPrefix: string,
  pluginAlias: string,
): string {
  return `Use \`${commandPrefix}${pluginAlias} search next\` | \`${commandPrefix}${pluginAlias} search prev\` | \`${commandPrefix}${pluginAlias} search page <n>\` | \`${commandPrefix}${pluginAlias} search import <id>\``;
}

export type SearchBookmarkEvent = {
  id: string;
  pubkey: string;
  created_at: number;
  url: string | null;
  title: string | null;
  category: string | null;
  media_type: string | null;
  tags: string[];
  wotScore: number | null;
  content: string;
};

export type BmSearchSession = {
  filters: BmSearchFilters;
  results: SearchBookmarkEvent[];
  page: number;
  pageSize: number;
  rawRelayCount: number;
  resultCount: number;
  wotSorted: boolean;
  titleMatchIds: number[];
  categoryMatchIds: number[];
  mediaTypeMatchIds: number[];
};

export type SearchSessionFormatOptions = {
  headerPrefix?: string;
  navigationHint?: string | null;
  commandPrefix?: string;
  pluginAlias?: string;
};

export function createEmptyBmSearchSession(
  filters: BmSearchFilters,
): BmSearchSession {
  return {
    filters,
    results: [],
    page: 1,
    pageSize: BM_SEARCH_PAGE_SIZE,
    rawRelayCount: 0,
    resultCount: 0,
    wotSorted: true,
    titleMatchIds: [],
    categoryMatchIds: [],
    mediaTypeMatchIds: [],
  };
}

export type PublishedSearchDebugInfo = {
  relayCount: number;
  relays: string[];
  queryDurationMs: number;
  rawEventCount: number;
  parsedEventCount: number;
  filteredEventCount: number;
  titleMatchCount: number;
  categoryMatchCount: number;
  mediaTypeMatchCount: number;
};

type SearchPublishedBmsProps = {
  filters: BmSearchFilters;
  pool: PluginContext['pool'];
  masterPubkey: string;
  getWotScore: PluginContext['getWotScore'];
  onDebug?: (info: PublishedSearchDebugInfo) => void;
};

function getTagValue(event: NostrEvent, name: string): string | null {
  const tag = event.tags.find((entry) => entry[0] === name && entry[1]);

  return tag?.[1] ?? null;
}

function getTagValues(event: NostrEvent, name: string): string[] {
  return event.tags
    .filter((entry) => entry[0] === name && entry[1])
    .map((entry) => entry[1].trim())
    .filter(Boolean);
}

function toBookmarkUrl(identifier: string | null): string | null {
  if (!identifier) {
    return null;
  }

  return /^https?:\/\//i.test(identifier)
    ? identifier
    : `https://${identifier}`;
}

function parseSearchBookmarkEvent(
  event: NostrEvent,
  getWotScore: PluginContext['getWotScore'],
): SearchBookmarkEvent {
  return {
    id: event.id,
    pubkey: event.pubkey,
    created_at: event.created_at,
    url: toBookmarkUrl(getTagValue(event, 'd')),
    title: getTagValue(event, 'title'),
    category: getTagValue(event, 'category'),
    media_type: getTagValue(event, 'm'),
    tags: getTagValues(event, 't').map((tag) => tag.toLowerCase()),
    wotScore: getWotScore(event.pubkey),
    content: event.content,
  };
}

function matchesTitle(title: string | null, needle: string | null): boolean {
  if (!needle) {
    return true;
  }

  return title?.toLowerCase().includes(needle.toLowerCase()) ?? false;
}

function matchesCategory(
  value: string | null,
  category: string | null,
): boolean {
  if (!category) {
    return true;
  }

  return value === category;
}

function matchesMediaType(
  value: string | null,
  mediaType: string | null,
): boolean {
  if (!mediaType) {
    return true;
  }

  return value === mediaType;
}

function buildRelayFilter(filters: BmSearchFilters): Filter {
  const filter: Filter = {
    kinds: [BM_BOOKMARK_KIND],
    limit: filters.limit ?? 200,
  };

  if (filters.tags_any.length > 0) {
    filter['#t'] = filters.tags_any;
  }

  return filter;
}

function buildFullTextRelayFilter(filters: BmSearchFilters): Filter {
  return {
    kinds: [BM_BOOKMARK_KIND],
    limit: filters.limit ?? 200,
    search: filters.title ?? '',
  };
}

function formatSearchBookmark(
  item: SearchBookmarkEvent,
  index: number,
): string {
  const score = item.wotScore === null ? 'n/a' : item.wotScore.toFixed(2);

  return [
    `${index + 1}. ${item.title ?? '(untitled bookmark)'}`,
    `Author: ${item.pubkey}`,
    `WoT: ${score}`,
    `Media: ${item.media_type ?? '—'}`,
    `Category: ${item.category ?? '—'}`,
    `Tags: ${item.tags.join(', ') || '—'}`,
    `URL: ${item.url ?? '—'}`,
  ].join('\n');
}

function clampPage(page: number, totalPages: number): number {
  return Math.min(Math.max(page, 1), Math.max(totalPages, 1));
}

function getTotalPages(session: BmSearchSession): number {
  return Math.max(1, Math.ceil(session.results.length / session.pageSize));
}

export function formatSearchSession(
  session: BmSearchSession,
  options: SearchSessionFormatOptions = {},
): string {
  const { headerPrefix, commandPrefix, pluginAlias } = options;
  let navigationHint = options.navigationHint;

  if (navigationHint === undefined) {
    if (commandPrefix !== undefined && pluginAlias !== undefined) {
      navigationHint = formatBmSearchNavigationHint(commandPrefix, pluginAlias);
    } else {
      navigationHint = null;
    }
  }

  const totalPages = getTotalPages(session);
  const page = clampPage(session.page, totalPages);
  const startIndex = (page - 1) * session.pageSize;

  const pageItems = session.results.slice(
    startIndex,
    startIndex + session.pageSize,
  );

  const countHeader = `${session.results.length} published bookmark${session.results.length === 1 ? '' : 's'}`;

  const headerLines = headerPrefix
    ? [headerPrefix, countHeader]
    : [countHeader];

  if (totalPages <= 1) {
    return [
      ...headerLines,
      '',
      ...pageItems.map((item, index) =>
        formatSearchBookmark(item, startIndex + index),
      ),
    ].join('\n\n');
  }

  const header = [
    ...headerLines,
    `Page ${page} of ${totalPages}`,
    ...(navigationHint ? [navigationHint] : []),
  ].join('\n');

  const footer = [
    `Page ${page} of ${totalPages}`,
    ...(navigationHint ? [navigationHint] : []),
  ].join('\n');

  return [
    header,
    '',
    ...pageItems.map((item, index) =>
      formatSearchBookmark(item, startIndex + index),
    ),
    '',
    footer,
  ].join('\n\n');
}

export function getSearchSessionPage(
  session: BmSearchSession,
  page: number,
  options: SearchSessionFormatOptions = {},
): string {
  return formatSearchSession(
    {
      ...session,
      page: clampPage(page, getTotalPages(session)),
    },
    options,
  );
}

export async function searchPublishedBms(
  props: SearchPublishedBmsProps,
): Promise<BmSearchSession | null> {
  const { filters, pool, masterPubkey, getWotScore, onDebug } = props;

  const fullTextSearch =
    filters.title !== null && filters.tags_any.length === 0;

  debug('bm published search start', {
    mode: fullTextSearch ? 'full-text' : 'hashtag',
    title: filters.title,
    tagsAny: filters.tags_any,
    category: filters.category,
    mediaType: filters.media_type,
    limit: filters.limit,
    clientRelayCount: filters.relays.length,
  });

  const relays = fullTextSearch
    ? (
        await getBmNip50RelaySupport({
          pool,
          masterPubkey,
          relays: filters.relays,
        })
      ).supportedRelays
    : await fetchNip65WriteRelays({
        pool,
        authorPubkey: normalizePubkeyInput(masterPubkey),
      });

  if (fullTextSearch && relays.length === 0) {
    debug('bm full-text search no NIP-50 relays', {
      query: filters.title,
      clientRelayCount: filters.relays.length,
      clientRelays: filters.relays,
    });
  }

  const relayFilter = fullTextSearch
    ? buildFullTextRelayFilter(filters)
    : buildRelayFilter(filters);

  debug('bm published search relay query', {
    mode: fullTextSearch ? 'full-text' : 'hashtag',
    relayCount: relays.length,
    relays,
    filter: relayFilter,
  });

  const queryStartedAt = Date.now();

  const events =
    relays.length === 0
      ? []
      : await queryNostrWithNode({
          relays,
          filter: relayFilter,
          maxWait: 8_000,
          debugLabel: `bm published ${fullTextSearch ? 'full-text' : 'hashtag'} search`,
        });

  const queryDurationMs = Date.now() - queryStartedAt;

  debug('bm published search relay result', {
    mode: fullTextSearch ? 'full-text' : 'hashtag',
    relayCount: relays.length,
    queryDurationMs,
    rawEventCount: events.length,
  });

  const parsed = events.map((event) =>
    parseSearchBookmarkEvent(event, getWotScore),
  );

  const filtered = parsed;

  const titleMatchCount = parsed.filter((item) =>
    matchesTitle(item.title, filters.title),
  ).length;

  const categoryMatchCount = parsed.filter((item) =>
    matchesCategory(item.category, filters.category),
  ).length;

  const mediaTypeMatchCount = parsed.filter((item) =>
    matchesMediaType(item.media_type, filters.media_type),
  ).length;

  onDebug?.({
    relayCount: relays.length,
    relays,
    queryDurationMs,
    rawEventCount: events.length,
    parsedEventCount: parsed.length,
    filteredEventCount: filtered.length,
    titleMatchCount,
    categoryMatchCount,
    mediaTypeMatchCount,
  });

  if (fullTextSearch) {
    debug('bm full-text search parsed result', {
      query: filters.title,
      parsedEventCount: parsed.length,
      filteredEventCount: filtered.length,
      titleMatchCount,
      categoryMatchCount,
      mediaTypeMatchCount,
      sampleEventIds: filtered.slice(0, 5).map((event) => event.id),
    });
  }

  if (filtered.length === 0) {
    return null;
  }

  const hasAnyWotScore = filtered.some((item) => item.wotScore !== null);

  filtered.sort((a, b) => {
    if (hasAnyWotScore) {
      const aScore = a.wotScore ?? -1;
      const bScore = b.wotScore ?? -1;

      if (bScore !== aScore) {
        return bScore - aScore;
      }
    }

    return b.created_at - a.created_at;
  });

  const titleMatchIds = filtered
    .map((item, index) =>
      matchesTitle(item.title, filters.title) ? index + 1 : null,
    )
    .filter((id): id is number => id !== null);

  const categoryMatchIds = filtered
    .map((item, index) =>
      matchesCategory(item.category, filters.category) ? index + 1 : null,
    )
    .filter((id): id is number => id !== null);

  const mediaTypeMatchIds = filtered
    .map((item, index) =>
      matchesMediaType(item.media_type, filters.media_type) ? index + 1 : null,
    )
    .filter((id): id is number => id !== null);

  return {
    filters,
    results: filtered,
    page: 1,
    pageSize: BM_SEARCH_PAGE_SIZE,
    rawRelayCount: events.length,
    resultCount: filtered.length,
    wotSorted: true,
    titleMatchIds,
    categoryMatchIds,
    mediaTypeMatchIds,
  };
}

export async function searchHashtagPublishedBms(
  props: SearchPublishedBmsProps,
): Promise<BmSearchSession | null> {
  return searchPublishedBms(props);
}

export async function searchFullTextPublishedBms(
  props: SearchPublishedBmsProps,
): Promise<BmSearchSession | null> {
  return searchPublishedBms(props);
}
