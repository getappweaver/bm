// ---------------------------------------------------------------------------
// plugins/bm/ai.ts — !bm ai <prompt> handler
//
// Calls the agent with a system prompt and parses tool calls (list, create,
// update, delete). For list we return the formatted list; for create/update/
// delete we store drafts and return previews. Replace or extend the prompt
// and handling in tool.ts to match your plugin’s operations.
// ---------------------------------------------------------------------------

import type { Database } from 'bun:sqlite';
import { z } from 'zod';

import type { AgentRunResult } from '@src/backends/types';
import { getOutputString } from '@src/backends/types';
import type { PluginIdentity } from '@src/core/plugin';
import type { ParseSettledResult } from '@src/tools/utils';
import { parseToolCalls } from '@src/tools/utils';

import { buildBmPluginContextText } from './context';
import { getBm, listBms, updateBm } from './db';
import { storeDraft } from './drafts';
import {
  formatBmDetail,
  formatBms,
  formatCreateDraftList,
  formatDraftReply,
} from './format';
import {
  type BmListFilters,
  CreateBmInputSchema,
  UpdateBmInputSchema,
  normalizeBmListFilters,
  normalizeCreateBmInput,
} from './types';

const BmListCallSchema = z.object({
  type: z.literal('list'),
  tags_all: z
    .array(z.string().min(1))
    .optional()
    .describe(
      'Bookmark must include every tag (AND). Match is case-insensitive; tags are stored comma-separated.',
    ),
  category: z
    .string()
    .min(1)
    .nullable()
    .optional()
    .describe(
      "Category filter: exact path, subtree under that prefix (path||'/%'), or any stored path where that slash-separated segment appears (e.g. 'nostr' matches 'tech/nostr/nips').",
    ),
  title_contains: z
    .string()
    .min(1)
    .nullable()
    .optional()
    .describe('Substring match on title (SQL LIKE, % and _ escaped).'),
  url_contains: z
    .string()
    .min(1)
    .nullable()
    .optional()
    .describe('Substring match on URL.'),
  to_read: z
    .boolean()
    .optional()
    .describe(
      'If true, only reading-list bookmarks; if false, only non–reading-list; omit for all.',
    ),
});

const BmContextCallSchema = z.object({
  type: z.literal('context'),
});

const BmCreateCallSchema = z.object({
  type: z.literal('create'),
  input: CreateBmInputSchema,
  original_prompt: z.string(),
});

const BmUpdateCallSchema = z.object({
  type: z.literal('update'),
  input: UpdateBmInputSchema,
  original_prompt: z.string(),
});

const BmDeleteCallSchema = z.object({
  type: z.literal('delete'),
  input: z.object({ id: z.number().int().positive() }),
  original_prompt: z.string(),
});

const BmToolCallSchema = z.discriminatedUnion('type', [
  BmListCallSchema,
  BmContextCallSchema,
  BmCreateCallSchema,
  BmUpdateCallSchema,
  BmDeleteCallSchema,
]);

type BmToolCall = z.infer<typeof BmToolCallSchema>;

type BmListCall = z.infer<typeof BmListCallSchema>;

function bmListCallToFilters(call: BmListCall): BmListFilters {
  return normalizeBmListFilters({
    tags_all: call.tags_all,
    category: call.category ?? undefined,
    title_contains: call.title_contains ?? undefined,
    url_contains: call.url_contains ?? undefined,
    to_read: call.to_read,
  });
}

export { BmToolCallSchema as ToolCallSchema };
export const skillDescription =
  'Bookmark management via local dm-bot CLI tools (list, taxonomy context, create/update/delete drafts).';

export function buildSystemPrompt(userPrompt: string, context: string): string {
  const schema = z.toJSONSchema(BmToolCallSchema);

  const createRules = [
    'For type "create": you MUST fetch the URL first when it is fetchable (https/http raw files, READMEs, etc.)—use your web or fetch capability before emitting the tool call.',
    'Fill title, description, category, and tags from the fetched body: real heading or first meaningful line for title; slash categories and comma-separated tags aligned with context below.',
    'Include input.summary ONLY when the user clearly asked for a page summary (e.g. summarize, tl;dr, overview). Otherwise omit summary entirely—do not fill it by default.',
    'Only skip fetching if the URL scheme cannot be retrieved (e.g. nostr:, intent-only links); then infer conservatively from the URL text and user message.',
  ].join('\n');

  return `You are helping the user manage bookmarks. Current state:\n${context}\n\nUser request: "${userPrompt}"\n\n${createRules}\n\nOutput one or more JSON objects matching this schema (one per line for multiple). No markdown.\n\n${JSON.stringify(schema, null, 2)}`;
}

export function parseBmToolCalls(
  raw: string,
): ParseSettledResult<BmToolCall>[] {
  return parseToolCalls({ raw, schema: BmToolCallSchema });
}

export type HandleBmAiProps = {
  args: string[];
  db: Database;
  identity: PluginIdentity;
  runAgent: (prompt: string) => Promise<AgentRunResult>;
};

const BM_SUMMARY_MAX_LENGTH = 12_000;

type HandleBmSummarizeProps = {
  id: number;
  db: Database;
  identity: PluginIdentity;
  runAgent: (prompt: string) => Promise<AgentRunResult>;
};

function stripMarkdownCodeFence(text: string): string {
  const t = text.trim();

  if (!t.startsWith('```')) {
    return t;
  }

  return t
    .replace(/^```[a-z0-9]*\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();
}

function buildBookmarkSummarizePrompt(bm: {
  title: string;
  url: string;
}): string {
  return [
    'You are writing a bookmark summary to store in a local database.',
    '',
    `Title: ${bm.title}`,
    `URL: ${bm.url}`,
    '',
    'Fetch this URL when it is http or https and your tools allow it. If you cannot fetch, infer briefly from the title and URL and state that the page was not retrieved.',
    '',
    'Reply with plain text only: 2–6 sentences on what the resource is and why it matters. No JSON, no markdown code fences, no preamble (do not start with "Here is" or "Summary:").',
  ].join('\n');
}

/** Chat: `!bm summarize <id>` — agent fetches URL and writes `summary` on the row. */
export async function handleBmSummarize({
  id,
  db,
  identity,
  runAgent,
}: HandleBmSummarizeProps): Promise<string> {
  const alias = identity.alias;
  const bm = getBm(db, id);

  if (!bm) {
    return `Not found: #${id}`;
  }

  const result = await runAgent(buildBookmarkSummarizePrompt(bm));
  let text = getOutputString(result).trim();

  if (!text || text === '(no output)') {
    return `!${alias} summarize: model returned no text. Try again.`;
  }

  text = stripMarkdownCodeFence(text);

  if (text.length > BM_SUMMARY_MAX_LENGTH) {
    text = text.slice(0, BM_SUMMARY_MAX_LENGTH);
  }

  const updated = updateBm(db, { id, summary: text });

  if (!updated) {
    return `Not found: #${id}`;
  }

  return [`Updated summary for #${id}.`, '', formatBmDetail(updated)].join(
    '\n',
  );
}

export async function handleBmAi({
  args,
  db,
  identity,
  runAgent,
}: HandleBmAiProps): Promise<string> {
  const userPrompt = args.join(' ').trim();
  const alias = identity.alias;

  if (!userPrompt) {
    return `Usage: !${alias} ai <natural language request>`;
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

  const cmd = `!${alias}`;
  const previews: string[] = [];
  let hasMutatingDraft = false;

  for (const { value } of fulfilled) {
    if (value.type === 'list') {
      const filters = bmListCallToFilters(value);
      const list = listBms({ db, filters });

      return list.length === 0 ? 'No bookmarks.' : formatBms(list);
    }

    if (value.type === 'context') {
      previews.push(buildBmPluginContextText({ db }));

      continue;
    }

    if (value.type === 'create') {
      hasMutatingDraft = true;

      const input = normalizeCreateBmInput(value.input);

      const draftId = storeDraft(db, {
        kind: 'create',
        input,
        originalPrompt: value.original_prompt,
      });

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

      const existing = getBm(db, value.input.id);

      if (!existing) {
        previews.push(
          `Bookmark not found: ${value.input.id}. Call list first.`,
        );

        continue;
      }

      const draftId = storeDraft(db, {
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

      const item = getBm(db, value.input.id);

      if (!item) {
        previews.push(
          `Bookmark not found: ${value.input.id}. Call list first.`,
        );

        continue;
      }

      const draftId = storeDraft(db, {
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

  return [
    `You can accept all: ${cmd} accept all`,
    '',
    previews.join('\n\n'),
  ].join('\n');
}

export function agentInstructions(alias: string): string {
  return `## Bookmark (${alias} tools)

Use the CLI tools for list/show/create/update/delete bookmark flows.
Run \`bun src/cli.ts bm context\` (tool \`context\`) to print the same tag/category snapshot (with counts) as \`!bm ai\`; use \`bm list\` when you need bookmark ids or titles.
For \`list\`, pass explicit filter fields when the user narrows results: \`tags_all\` (every tag required, AND), \`category\` (exact path, subtree prefix, or segment anywhere in the path e.g. \`nostr\` matches \`tech/nostr/nips\`), \`title_contains\`, \`url_contains\`, \`to_read\`. Combine filters when appropriate.
For mutating calls (create/update/delete), include \`original_prompt\` at the top level with the user request verbatim.
For \`create\`: fetch http/https when possible; fill \`input.title\`, \`description\`, \`category\`, \`tags\` from content. Set \`input.summary\` only if the user explicitly asked for a summary; otherwise omit it.
For a live summary on an existing row, the user runs chat \`!${alias} summarize <id>\` (agent backend required)—not a CLI tool schema branch.

After a mutating call returns a draft:
- \`!${alias} accept <draft_id>\`
- \`!${alias} revise <draft_id> <corrections>\`
- \`!${alias} decline <draft_id>\`
`;
}

export async function executeTool({
  alias,
  call,
  db,
}: {
  alias: string;
  call: BmToolCall;
  db: Database;
}): Promise<string> {
  const cmd = `!${alias}`;

  switch (call.type) {
    case 'list': {
      const filters = bmListCallToFilters(call);
      const list = listBms({ db, filters });

      return list.length === 0 ? 'No bookmarks.' : formatBms(list);
    }

    case 'context': {
      return buildBmPluginContextText({ db });
    }

    case 'create': {
      const input = normalizeCreateBmInput(call.input);

      const draftId = storeDraft(db, {
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
  }
}

// Re-export so CLI can open the plugin DB without importing init/bot wiring.
export { openDb } from './db';
