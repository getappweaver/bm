// ---------------------------------------------------------------------------
// plugins/bm/commands/summarize/handler.ts
// ---------------------------------------------------------------------------

import type { HandleBmCommandProps } from '../../command-context';

import { handleBmSummarize } from '../ai/handle-summarize';

export async function handleSummarizeCommand(
  cmd: HandleBmCommandProps,
): Promise<string> {
  const { identity, prefix, agent, db, rest } = cmd;
  const alias = identity.alias;

  const idRaw = rest[0]?.trim();

  if (!idRaw) {
    return `Usage: ${prefix}${alias} summarize <id>`;
  }

  const id = parseInt(idRaw, 10);

  if (Number.isNaN(id)) {
    return `Usage: ${prefix}${alias} summarize <id>`;
  }

  return handleBmSummarize({ id, db, identity, prefix, agent });
}
