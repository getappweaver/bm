// ---------------------------------------------------------------------------
// plugins/bm/commands/search/search-import.ts — helpers for !bm search import …
// ---------------------------------------------------------------------------

import type { Database } from 'bun:sqlite';
import { nip19 } from 'nostr-tools';
import type { SimplePool } from 'nostr-tools/pool';

import { getOutputString } from '@src/backends/types';
import type { PluginAgentService } from '@src/core/plugin';
import { fetchNip65WriteRelays } from '@src/nostr/nip65';
import { normalizePubkeyInput } from '@src/nostr/wot';

import { runBmAgent } from '../../agent';
import { getBmByUrl } from '../../db';
import { createDraftSessionId, storeDraft } from '../../drafts/index';
import {
  formatBmDetail,
  formatCreateDraftList,
  formatDraftReply,
} from '../../format';
import {
  CreateBmInputSchema,
  normalizeImportBmInput,
  type CreateBmDraft,
  type ImportBmInput,
} from '../../types';

import type { SearchBookmarkEvent } from './search';

export function buildRawBookmarkInput(
  result: SearchBookmarkEvent,
): CreateBmDraft {
  const url = result.url ?? `nostr:${result.id}`;
  const title = result.title?.trim() || `Bookmark from ${result.pubkey}`;
  const mediaType = result.media_type?.trim() || 'read';
  const category = result.category?.trim() || 'imported/nostr';
  const tags = result.tags.length > 0 ? result.tags.join(', ') : 'nostr';

  return normalizeImportBmInput({
    url,
    title,
    summary: null,
    description: result.content.trim() || null,
    category,
    tags,
    media_type: mediaType,
    in_queue: false,
  });
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

export function buildSearchAddPrompt(result: SearchBookmarkEvent): string {
  return [
    'Convert this published Nostr bookmark into a local bookmark create JSON.',
    'Return JSON only for the bookmark input object itself, not a wrapper object.',
    'Choose a useful title, category, media_type, and tags.',
    'If fields are missing, infer conservatively from the available data.',
    'Set in_queue to false unless the source strongly implies save-for-later.',
    '',
    `Source event id: ${result.id}`,
    `Author pubkey: ${result.pubkey}`,
    `URL: ${result.url ?? ''}`,
    `Title: ${result.title ?? ''}`,
    `Category: ${result.category ?? ''}`,
    `Media type: ${result.media_type ?? ''}`,
    `Tags: ${result.tags.join(', ')}`,
    `Content: ${result.content}`,
  ].join('\n');
}

export function formatExistingBookmarkForDuplicate(props: {
  existing: NonNullable<ReturnType<typeof getBmByUrl>>;
  displayIndex: number;
}): string {
  const { existing, displayIndex } = props;

  return [
    `Search result ${displayIndex} already exists locally as #${existing.id}.`,
    '',
    formatBmDetail(existing),
  ].join('\n');
}

export function stripMarkdownCodeFence(text: string): string {
  const trimmed = text.trim();

  if (!trimmed.startsWith('```')) {
    return trimmed;
  }

  return trimmed
    .replace(/^```[a-z0-9]*\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();
}

export function unwrapCreateBmInputCandidate(raw: string): unknown {
  const parsed = JSON.parse(raw) as Record<string, unknown>;

  if (
    parsed &&
    typeof parsed === 'object' &&
    parsed.type === 'create' &&
    parsed.input &&
    typeof parsed.input === 'object'
  ) {
    return parsed.input;
  }

  return parsed;
}

export async function createDraftFromSearchResult(props: {
  result: SearchBookmarkEvent;
  displayIndex: number;
  agent: PluginAgentService;
  db: Database;
  alias: string;
  prefix: string;
  pool: SimplePool;
  masterPubkey: string;
}): Promise<string> {
  const { result, displayIndex, agent, db, alias, prefix, pool, masterPubkey } =
    props;

  const rawInput = buildRawBookmarkInput(result);
  const existing = getBmByUrl(db, rawInput.url);

  if (existing) {
    return formatExistingBookmarkForDuplicate({
      existing,
      displayIndex,
    });
  }

  const aiResult = await runBmAgent({
    agent,
    prompt: buildSearchAddPrompt(result),
    sessionId: null,
  });

  const raw = stripMarkdownCodeFence(getOutputString(aiResult));
  const parsed = CreateBmInputSchema.parse(unwrapCreateBmInputCandidate(raw));

  const normalized = normalizeImportBmInput({
    ...parsed,
    ...(await buildImportedPublishedMeta({
      result,
      pool,
      masterPubkey,
    })),
  });

  const duplicateAfterAi = getBmByUrl(db, normalized.url);

  if (duplicateAfterAi) {
    return formatExistingBookmarkForDuplicate({
      existing: duplicateAfterAi,
      displayIndex,
    });
  }

  const draftId = storeDraft(db, {
    sessionId: createDraftSessionId(),
    agentSessionId: aiResult.sessionId,
    kind: 'create',
    input: normalized,
    originalPrompt: `Search add from result #${result.id}`,
  });

  return [
    `Draft #${draftId} [create]:`,
    '',
    formatCreateDraftList(normalized),
    '',
    formatDraftReply(`${prefix}${alias}`, draftId, 'create'),
  ].join('\n');
}
