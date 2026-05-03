// ---------------------------------------------------------------------------
// plugins/bm/commands/show/handler.ts
// ---------------------------------------------------------------------------

import type { HandleBmCommandProps } from '../../command-context';
import { getBm } from '../../db';
import type { Bm } from '../../types';

export function handleShowCommand(cmd: HandleBmCommandProps): string | Bm {
  const { db, rest, identity, prefix } = cmd;
  const alias = identity.alias;
  const idRaw = rest[0]?.trim();

  if (!idRaw) {
    return `Usage: ${prefix}${alias} show <id>`;
  }

  const id = parseInt(idRaw, 10);

  if (Number.isNaN(id)) {
    return `Usage: ${prefix}${alias} show <id> (number required)`;
  }

  const item = getBm(db, id);

  if (!item) {
    return `Not found: #${id}`;
  }

  // Return the bookmark object for web rendering
  return item;
}
