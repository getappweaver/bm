// ---------------------------------------------------------------------------
// plugins/bm/commands/done/handler.ts
// ---------------------------------------------------------------------------

import type { HandleBmCommandProps } from '../../command-context';
import { markBmDone } from '../../db';
import { formatBmDetail } from '../../format';

export function handleDoneCommand(cmd: HandleBmCommandProps): string {
  const { db, rest, identity, prefix } = cmd;
  const alias = identity.alias;
  const idRaw = rest[0]?.trim();

  if (!idRaw) {
    return `Usage: ${prefix}${alias} done <id>`;
  }

  const id = parseInt(idRaw, 10);

  if (Number.isNaN(id)) {
    return `Usage: ${prefix}${alias} done <id>`;
  }

  const updated = markBmDone({ db, id });

  if (!updated) {
    return `Not found: #${id}`;
  }

  return [`Marked done #${id}.`, '', formatBmDetail(updated)].join('\n');
}
