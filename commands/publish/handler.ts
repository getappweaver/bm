// ---------------------------------------------------------------------------
// plugins/bm/commands/publish/handler.ts
// ---------------------------------------------------------------------------

import type { HandleBmCommandProps } from '../../command-context';
import { publishBm } from '../../publish';

export async function handlePublishCommand(
  cmd: HandleBmCommandProps,
): Promise<string> {
  const { db, rest, identity, prefix, sendReply, signWithBunker, pool } = cmd;
  const alias = identity.alias;
  const idRaw = rest[0]?.trim();

  if (!idRaw) {
    return `Usage: ${prefix}${alias} publish <id>`;
  }

  const id = parseInt(idRaw, 10);

  if (Number.isNaN(id)) {
    return `Usage: ${prefix}${alias} publish <id>`;
  }

  return publishBm({
    db,
    id,
    sendReply,
    signWithBunker,
    pool,
  });
}
