// ---------------------------------------------------------------------------
// plugins/bm/commands/ai/execute-tool.ts — bun src/cli.ts bm <tool> (CLI path)
// ---------------------------------------------------------------------------

import type { Database } from 'bun:sqlite';
import type { SimplePool } from 'nostr-tools/pool';

import { debug } from '@src/logger';

import { buildBmPluginContextText } from '../../context';
import { getBm, getBmByUrl, listBmsWithQueueFallback } from '../../db';
import { createDraftSessionId, storeDraft } from '../../drafts/index';
import {
  formatBms,
  formatCreateDraftList,
  formatDraftReply,
} from '../../format';
import { normalizeCreateBmInput, normalizeImportBmInput } from '../../types';

import {
  createBmSearchSession,
  getBmSearchResultByDisplayIndex,
  getBmSearchSessionPageResults,
  getBmSearchSessionResultsByIds,
  getBmSearchSession,
  searchPublishedBms,
} from '../search';

import type { BmToolCall } from './schemas';
import {
  bmListCallToFilters,
  buildImportedPublishedMeta,
  buildRawBookmarkInputFromSearchResult,
  formatExistingBookmarkDuplicate,
  formatPublishedSearchResults,
  formatPublishedSearchSummary,
  normalizePublishedSearchFilters,
} from './tool-helpers';

type ExecuteBmToolProps = {
  alias: string;
  prefix: string;
  call: BmToolCall;
  db: Database;
  pool: SimplePool | undefined;
  masterPubkey: string | undefined;
  getWotScore:
    ((pubkey: string, rootPubkey?: string) => number | null) | undefined;
};

export async function executeTool({
  alias,
  prefix,
  call,
  db,
  pool,
  masterPubkey,
  getWotScore,
}: ExecuteBmToolProps): Promise<string> {
  const cmd = `${prefix}${alias}`;

  switch (call.type) {
    case 'list': {
      const filters = bmListCallToFilters(call);

      const { items, expandedFromQueue } = listBmsWithQueueFallback({
        db,
        filters,
      });

      return items.length === 0
        ? 'No bookmarks.'
        : formatBms(items, { expandedFromQueue });
    }

    case 'context': {
      return buildBmPluginContextText({ db });
    }

    case 'create': {
      const input = normalizeCreateBmInput(call.input);

      const draftId = storeDraft(db, {
        sessionId: createDraftSessionId(),
        kind: 'create',
        input,
        originalPrompt: call.original_prompt,
      });

      return [
        'Create:',
        '',
        formatCreateDraftList(input),
        '',
        `Draft ID: ${draftId}`,
        formatDraftReply(cmd, draftId, 'create'),
      ].join('\n');
    }

    case 'update': {
      const existing = getBm(db, call.input.id);

      if (!existing) {
        return `Bookmark not found: ${call.input.id}. Call list first.`;
      }

      const draftId = storeDraft(db, {
        sessionId: createDraftSessionId(),
        kind: 'update',
        input: call.input,
        originalPrompt: call.original_prompt,
      });

      return [
        `Update #${call.input.id}: "${existing.title}" (${existing.url})`,
        '',
        `Draft ID: ${draftId}`,
        formatDraftReply(cmd, draftId, 'update'),
      ].join('\n');
    }

    case 'delete': {
      const item = getBm(db, call.input.id);

      if (!item) {
        return `Bookmark not found: ${call.input.id}. Call list first.`;
      }

      const draftId = storeDraft(db, {
        sessionId: createDraftSessionId(),
        kind: 'delete',
        input: { id: call.input.id },
        originalPrompt: call.original_prompt,
      });

      return [
        `Delete #${call.input.id}: "${item.title}" (${item.url})`,
        '',
        `Draft ID: ${draftId}`,
        formatDraftReply(cmd, draftId, 'delete'),
      ].join('\n');
    }

    case 'published_search': {
      if (!pool || !masterPubkey || !getWotScore) {
        return 'Published search requires pool, masterPubkey, and getWotScore context.';
      }

      const session = await searchPublishedBms({
        filters: normalizePublishedSearchFilters(call),
        pool,
        masterPubkey,
        getWotScore,
        onDebug: (info) => {
          debug('bm published_search debug', info);
        },
      });

      if (!session) {
        return 'No published bookmarks matched.';
      }

      const storedSession = createBmSearchSession(db, session);

      return formatPublishedSearchSummary({
        sessionId: storedSession.sessionId,
        session: storedSession,
      });
    }

    case 'published_search_page': {
      const session = getBmSearchSession(db, call.session_id);

      if (!session) {
        return `Published search session not found: ${call.session_id}`;
      }

      const targetPage =
        call.page ??
        (call.direction === 'next'
          ? session.page + 1
          : call.direction === 'prev'
            ? session.page - 1
            : session.page);

      const payload = getBmSearchSessionPageResults(
        db,
        call.session_id,
        targetPage,
      );

      if (!payload) {
        return `Published search session not found: ${call.session_id}`;
      }

      return formatPublishedSearchResults({
        sessionId: payload.session.sessionId,
        pageSize: payload.session.pageSize,
        page: targetPage,
        results: payload.results,
      });
    }

    case 'published_search_results': {
      const byIds = call.result_ids?.length
        ? getBmSearchSessionResultsByIds(db, call.session_id, call.result_ids)
        : null;

      const byPage =
        !byIds && call.page
          ? getBmSearchSessionPageResults(db, call.session_id, call.page)
          : null;

      const payload = byIds ?? byPage;

      if (!payload) {
        return `Published search session not found: ${call.session_id}`;
      }

      return formatPublishedSearchResults({
        sessionId: payload.session.sessionId,
        pageSize: payload.session.pageSize,
        page: call.page,
        results: payload.results,
      });
    }

    case 'create_from_published_search': {
      if (!pool || !masterPubkey) {
        return 'Published search import requires pool and masterPubkey context.';
      }

      const session = getBmSearchSession(db, call.session_id);

      if (!session) {
        return `Published search session not found: ${call.session_id}`;
      }

      const result = getBmSearchResultByDisplayIndex(call.result_id, session);

      if (!result) {
        return `Published search result not found: ${call.result_id} in ${call.session_id}.`;
      }

      const input = normalizeImportBmInput({
        ...buildRawBookmarkInputFromSearchResult(result),
        ...call.input_overrides,
        ...(await buildImportedPublishedMeta({
          result,
          pool,
          masterPubkey,
        })),
      });

      const existing = getBmByUrl(db, input.url);

      if (existing) {
        return formatExistingBookmarkDuplicate({
          existing,
          resultId: call.result_id,
        });
      }

      const draftId = storeDraft(db, {
        sessionId: createDraftSessionId(),
        kind: 'create',
        input,
        originalPrompt: call.original_prompt,
      });

      return [
        'Create from published search:',
        '',
        formatCreateDraftList(input),
        '',
        `Draft ID: ${draftId}`,
        formatDraftReply(cmd, draftId, 'create'),
      ].join('\n');
    }
  }

  return 'Unsupported bm tool call.';
}
