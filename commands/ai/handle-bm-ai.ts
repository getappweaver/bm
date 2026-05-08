// ---------------------------------------------------------------------------
// plugins/bm/commands/ai/handle-bm-ai.ts — !bm ai <prompt> (agent + tool JSON)
// ---------------------------------------------------------------------------

import type { Database } from 'bun:sqlite';
import type { SimplePool } from 'nostr-tools/pool';

import type { AgentRunResult } from '@src/backends/types';
import { getOutputString } from '@src/backends/types';
import type { PluginIdentity } from '@src/core/plugin';
import { debug } from '@src/logger';
import type { MessageSource } from '@src/messaging';

import type { HandleBmCommandProps } from '../../command-context';
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

import { parseBmToolCalls } from './parse-bm-tool-calls';
import { buildSystemPrompt } from './prompts';
import type { BmToolCall } from './schemas';
import { runDraftSessionInteractive } from './session';
import {
  bmListCallToFilters,
  buildImportedPublishedMeta,
  buildRawBookmarkInputFromSearchResult,
  formatExistingBookmarkDuplicate,
  formatPublishedSearchResults,
  formatPublishedSearchSummary,
  normalizePublishedSearchFilters,
} from './tool-helpers';

export type HandleBmAiProps = {
  args: string[];
  command: HandleBmCommandProps['command'];
  db: Database;
  identity: PluginIdentity;
  prefix: string;
  source: MessageSource;
  promptFn: HandleBmCommandProps['promptFn'];
  runAgent: (prompt: string) => Promise<AgentRunResult>;
  pool: SimplePool;
  masterPubkey: string;
  getWotScore: (pubkey: string, rootPubkey?: string) => number | null;
};

export async function handleBmAi({
  args,
  command,
  db,
  identity,
  prefix,
  source,
  runAgent,
  promptFn,
  pool,
  masterPubkey,
  getWotScore,
}: HandleBmAiProps): Promise<string> {
  const userPrompt = args.join(' ').trim();
  const alias = identity.alias;

  if (!userPrompt) {
    return `Usage: ${prefix}${alias} ai <natural language request>`;
  }

  const context = buildBmPluginContextText({ db });

  const systemPrompt = buildSystemPrompt(userPrompt, context);
  const result = await runAgent(systemPrompt);
  const raw = getOutputString(result).trim();

  if (!raw || raw === '(no output)') {
    return 'Model returned no output. Try again or rephrase.';
  }

  const results = parseBmToolCalls(raw);

  const fulfilled = results.filter(
    (r): r is { status: 'fulfilled'; value: BmToolCall } =>
      r.status === 'fulfilled',
  );

  if (fulfilled.length === 0) {
    const firstRejected = results.find((r) => r.status === 'rejected');

    const msg =
      firstRejected?.status === 'rejected'
        ? firstRejected.reason.message
        : 'No valid JSON';

    return `Failed to parse response: ${msg}`;
  }

  const cmd = `${prefix}${alias}`;
  const previews: string[] = [];
  let hasMutatingDraft = false;
  let createdDraftCount = 0;
  let hasNonCreateDraft = false;
  const sessionId = createDraftSessionId();

  for (const { value } of fulfilled) {
    if (value.type === 'list') {
      const filters = bmListCallToFilters(value);

      const { items, expandedFromQueue } = listBmsWithQueueFallback({
        db,
        filters,
      });

      return items.length === 0
        ? 'No bookmarks.'
        : formatBms(items, { expandedFromQueue });
    }

    if (value.type === 'context') {
      previews.push(buildBmPluginContextText({ db }));

      continue;
    }

    if (value.type === 'published_search') {
      const session = await searchPublishedBms({
        filters: normalizePublishedSearchFilters(value),
        pool,
        masterPubkey,
        getWotScore,
        onDebug: (info) => {
          debug('bm published_search debug', info);
        },
      });

      if (!session) {
        previews.push('No published bookmarks matched.');
      } else {
        const storedSession = createBmSearchSession(db, session);

        previews.push(
          formatPublishedSearchSummary({
            sessionId: storedSession.sessionId,
            session: storedSession,
          }),
        );
      }

      continue;
    }

    if (value.type === 'published_search_page') {
      const session = getBmSearchSession(db, value.session_id);

      if (!session) {
        previews.push(
          `Published search session not found: ${value.session_id}`,
        );

        continue;
      }

      const targetPage =
        value.page ??
        (value.direction === 'next'
          ? session.page + 1
          : value.direction === 'prev'
            ? session.page - 1
            : session.page);

      const payload = getBmSearchSessionPageResults(
        db,
        value.session_id,
        targetPage,
      );

      if (!payload) {
        previews.push(
          `Published search session not found: ${value.session_id}`,
        );

        continue;
      }

      previews.push(
        formatPublishedSearchResults({
          sessionId: payload.session.sessionId,
          pageSize: payload.session.pageSize,
          page: targetPage,
          results: payload.results,
        }),
      );

      continue;
    }

    if (value.type === 'published_search_results') {
      const byIds = value.result_ids?.length
        ? getBmSearchSessionResultsByIds(db, value.session_id, value.result_ids)
        : null;

      const byPage =
        !byIds && value.page
          ? getBmSearchSessionPageResults(db, value.session_id, value.page)
          : null;

      const payload = byIds ?? byPage;

      if (!payload) {
        previews.push(
          `Published search session not found: ${value.session_id}`,
        );

        continue;
      }

      previews.push(
        formatPublishedSearchResults({
          sessionId: payload.session.sessionId,
          pageSize: payload.session.pageSize,
          page: value.page,
          results: payload.results,
        }),
      );

      continue;
    }

    if (value.type === 'create_from_published_search') {
      hasMutatingDraft = true;

      const session = getBmSearchSession(db, value.session_id);

      if (!session) {
        previews.push(
          `Published search session not found: ${value.session_id}`,
        );

        continue;
      }

      const result = getBmSearchResultByDisplayIndex(value.result_id, session);

      if (!result) {
        previews.push(
          `Published search result not found: ${value.result_id} in ${value.session_id}.`,
        );

        continue;
      }

      const input = normalizeImportBmInput({
        ...buildRawBookmarkInputFromSearchResult(result),
        ...value.input_overrides,
        ...(await buildImportedPublishedMeta({
          result,
          pool,
          masterPubkey,
        })),
      });

      const existing = getBmByUrl(db, input.url);

      if (existing) {
        previews.push(
          formatExistingBookmarkDuplicate({
            existing,
            resultId: value.result_id,
          }),
        );

        continue;
      }

      const draftId = storeDraft(db, {
        sessionId,
        kind: 'create',
        input,
        originalPrompt: value.original_prompt,
      });

      createdDraftCount += 1;

      previews.push(
        [
          'Create from published search:',
          '',
          formatCreateDraftList(input),
          '',
          `Draft ID: ${draftId}`,
          formatDraftReply(cmd, draftId, 'create'),
        ].join('\n'),
      );

      continue;
    }

    if (value.type === 'create') {
      hasMutatingDraft = true;

      const input = normalizeCreateBmInput(value.input);

      const draftId = storeDraft(db, {
        sessionId,
        kind: 'create',
        input,
        originalPrompt: value.original_prompt,
      });

      createdDraftCount += 1;

      previews.push(
        [
          'Create:',
          '',
          formatCreateDraftList(input),
          '',
          `Draft ID: ${draftId}`,
          formatDraftReply(cmd, draftId, 'create'),
        ].join('\n'),
      );
    } else if (value.type === 'update') {
      hasMutatingDraft = true;
      hasNonCreateDraft = true;

      const existing = getBm(db, value.input.id);

      if (!existing) {
        previews.push(
          `Bookmark not found: ${value.input.id}. Call list first.`,
        );

        continue;
      }

      const draftId = storeDraft(db, {
        sessionId,
        kind: 'update',
        input: value.input,
        originalPrompt: value.original_prompt,
      });

      previews.push(
        [
          `Update #${value.input.id}: "${existing.title}" (${existing.url})`,
          '',
          `Draft ID: ${draftId}`,
          formatDraftReply(cmd, draftId, 'update'),
        ].join('\n'),
      );
    } else if (value.type === 'delete') {
      hasMutatingDraft = true;
      hasNonCreateDraft = true;

      const item = getBm(db, value.input.id);

      if (!item) {
        previews.push(
          `Bookmark not found: ${value.input.id}. Call list first.`,
        );

        continue;
      }

      const draftId = storeDraft(db, {
        sessionId,
        kind: 'delete',
        input: { id: value.input.id },
        originalPrompt: value.original_prompt,
      });

      previews.push(
        [
          `Delete #${value.input.id}: "${item.title}" (${item.url})`,
          '',
          `Draft ID: ${draftId}`,
          formatDraftReply(cmd, draftId, 'delete'),
        ].join('\n'),
      );
    }
  }

  if (previews.length === 0) {
    return 'No operations to show.';
  }

  if (!hasMutatingDraft) {
    return previews.join('\n\n');
  }

  if (createdDraftCount > 0 && !hasNonCreateDraft) {
    return runDraftSessionInteractive({
      args,
      command,
      rest: args,
      db,
      identity,
      prefix,
      source,
      pool,
      masterPubkey,
      runAgent,
      sendReply: async () => undefined,
      promptFn,
      getWotScore,
      signWithBunker: async () => {
        throw new Error('signWithBunker is not available in bm ai session');
      },
      helpText: () => [],
      sessionId,
    });
  }

  return [
    `You can accept all: ${cmd} accept all`,
    '',
    previews.join('\n\n'),
  ].join('\n');
}
