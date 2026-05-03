// ---------------------------------------------------------------------------
// plugins/bm/commands/delete/handler.ts
// ---------------------------------------------------------------------------

import type { HandleBmCommandProps } from '../../command-context';
import { deleteBm } from '../../db';

export function handleDeleteCommand(cmd: HandleBmCommandProps): string {
  const { db, rest, identity, prefix } = cmd;
  const alias = identity.alias;
  const idRaw = rest[0]?.trim();

  if (!idRaw) {
    return `Usage: ${prefix}${alias} delete <id>`;
  }

  const id = parseInt(idRaw, 10);

  if (Number.isNaN(id)) {
    return `Usage: ${prefix}${alias} delete <id> (number required)`;
  }

  if (!deleteBm(db, id)) {
    return `Not found: #${id}`;
  }

  return `Deleted #${id}.`;
}
