// ---------------------------------------------------------------------------
// plugins/bm/commands/queue/handler.ts
// ---------------------------------------------------------------------------

import type { HandleBmCommandProps } from '../../command-context';
import { markBmQueued } from '../../db';
import { formatBmDetail } from '../../format';

export function handleQueueCommand(cmd: HandleBmCommandProps): string {
  const { db, rest, identity, prefix } = cmd;
  const alias = identity.alias;
  const idRaw = rest[0]?.trim();

  if (!idRaw) {
    return `Usage: ${prefix}${alias} queue <id>`;
  }

  const id = parseInt(idRaw, 10);

  if (Number.isNaN(id)) {
    return `Usage: ${prefix}${alias} queue <id>`;
  }

  const updated = markBmQueued({ db, id });

  if (!updated) {
    return `Not found: #${id}`;
  }

  return [`Queued #${id}.`, '', formatBmDetail(updated)].join('\n');
}
