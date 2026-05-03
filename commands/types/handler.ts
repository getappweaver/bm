// ---------------------------------------------------------------------------
// plugins/bm/commands/types/handler.ts
// ---------------------------------------------------------------------------

import type { HandleBmCommandProps } from '../../command-context';
import { listBmMediaTypeCounts } from '../../db';
import { formatBmMediaTypeCounts } from '../../format';

export function handleTypesCommand(cmd: HandleBmCommandProps): string {
  const { db, rest, identity, prefix } = cmd;
  const alias = identity.alias;

  if (rest.length > 0) {
    return `Usage: ${prefix}${alias} types`;
  }

  const rows = listBmMediaTypeCounts(db);

  return rows.length === 0
    ? 'No media types yet.'
    : formatBmMediaTypeCounts(rows);
}
