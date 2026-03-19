// ---------------------------------------------------------------------------
// plugins/bm/ai.ts — !bm ai <prompt> handler
//
// Calls the agent with a system prompt and parses tool calls (list, create,
// update, delete). For list we return the formatted list; for create/update/
// delete we store drafts and return previews. Replace or extend the prompt
// and handling in tool.ts to match your plugin’s operations.
// ---------------------------------------------------------------------------

import type { Database } from 'bun:sqlite';

import type { AgentRunResult } from '@src/backends/types';
import { getOutputString } from '@src/backends/types';
import type { PluginIdentity } from '@src/core/plugin';

import { getBm, listBms } from './db';
import { storeDraft } from './drafts';
import { formatDraftReply } from './format';
import { formatBmTree } from './format';
import type { BmToolCall } from './tool';
import { buildSystemPrompt, parseBmToolCalls } from './tool';

export type HandleBmAiProps = {
  args: string[];
  db: Database;
  identity: PluginIdentity;
  runAgent: (prompt: string) => Promise<AgentRunResult>;
};

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

  const items = listBms(db);
  const context = items.length > 0 ? formatBmTree(items) : '(no bms yet)';
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

  for (const { value } of fulfilled) {
    if (value.type === 'list') {
      const list = listBms(db);

      return list.length === 0 ? 'No bms.' : formatBmTree(list);
    }

    if (value.type === 'create') {
      const draftId = storeDraft(db, {
        kind: 'create',
        input: value.input,
        originalPrompt: userPrompt,
      });

      previews.push(
        [
          'Create:',
          '',
          `  - ${value.input.data}`,
          '',
          `Draft ID: ${draftId}`,
          formatDraftReply(cmd, draftId, 'create'),
        ].join('\n'),
      );
    } else if (value.type === 'update') {
      const existing = getBm(db, value.input.id);

      if (!existing) {
        previews.push(`Bm not found: ${value.input.id}. Call list first.`);
        continue;
      }

      const draftId = storeDraft(db, {
        kind: 'update',
        input: value.input,
        originalPrompt: userPrompt,
      });

      previews.push(
        [
          `Update #${value.input.id}: "${existing.data}"`,
          '',
          `Draft ID: ${draftId}`,
          formatDraftReply(cmd, draftId, 'update'),
        ].join('\n'),
      );
    } else if (value.type === 'delete') {
      const item = getBm(db, value.input.id);

      if (!item) {
        previews.push(`Bm not found: ${value.input.id}. Call list first.`);
        continue;
      }

      const draftId = storeDraft(db, {
        kind: 'delete',
        input: { id: value.input.id },
        originalPrompt: userPrompt,
      });

      previews.push(
        [
          `Delete #${value.input.id}: "${item.data}"`,
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

  return [
    `You can accept all: ${cmd} accept all`,
    '',
    previews.join('\n\n'),
  ].join('\n');
}
