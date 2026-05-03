// ---------------------------------------------------------------------------
// plugins/bm/commands/ai/handle-summarize.ts — !bm summarize <id>
// ---------------------------------------------------------------------------

import type { Database } from 'bun:sqlite';

import type { AgentRunResult } from '@src/backends/types';
import { getOutputString } from '@src/backends/types';
import type { PluginIdentity } from '@src/core/plugin';

import { getBm, updateBm } from '../../db';
import { formatBmDetail } from '../../format';

const BM_SUMMARY_MAX_LENGTH = 12_000;

type HandleBmSummarizeProps = {
  id: number;
  db: Database;
  identity: PluginIdentity;
  prefix: string;
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
  prefix,
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
    return `${prefix}${alias} summarize: model returned no text. Try again.`;
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
