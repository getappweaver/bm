// ---------------------------------------------------------------------------
// plugins/bm/commands/publish/handler.ts
// ---------------------------------------------------------------------------

import type { HandleBmCommandProps } from '../../command-context';
import { getBm, setBmPublishedNaddr } from '../../db';

import { publishBm } from './publish';

export async function handlePublishCommand(
  cmd: HandleBmCommandProps,
): Promise<string> {
  const { db, rest, identity, prefix, sendReply, signWithBunker, pool } = cmd;
  const alias = identity.alias;
  const idRaw = rest[0]?.trim();
  const nostrUrl = rest[1]?.trim();

  if (!idRaw) {
    return `Usage: ${prefix}${alias} publish <id>`;
  }

  const id = parseInt(idRaw, 10);

  if (Number.isNaN(id)) {
    return `Usage: ${prefix}${alias} publish <id> [nostr://nevent...]`;
  }

  if (nostrUrl !== undefined && nostrUrl.length > 0) {
    if (!nostrUrl.startsWith('nostr://nevent')) {
      return 'Publish URL must start with nostr://nevent';
    }

    const existing = getBm(db, id);

    if (!existing) {
      return `Not found: #${id}`;
    }

    const updated = setBmPublishedNaddr({
      db,
      id,
      nostrNaddr: nostrUrl,
      publishedAt: Date.now(),
    });

    return updated
      ? `Marked #${id} as published: ${nostrUrl}`
      : `Not found: #${id}`;
  }

  return publishBm({
    db,
    id,
    sendReply,
    signWithBunker,
    pool,
  });
}
