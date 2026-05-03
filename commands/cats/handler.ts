// ---------------------------------------------------------------------------
// plugins/bm/commands/cats/handler.ts
// ---------------------------------------------------------------------------

import type { HandleBmCommandProps } from '../../command-context';
import { listBmCategoryCounts } from '../../db';
import { formatBmCategoryCounts } from '../../format';

export function handleCatsCommand(cmd: HandleBmCommandProps): string {
  const { db, rest, identity, prefix } = cmd;
  const alias = identity.alias;

  if (rest.length > 0) {
    return `Usage: ${prefix}${alias} cats`;
  }

  const rows = listBmCategoryCounts(db);

  return rows.length === 0
    ? 'No categories yet.'
    : formatBmCategoryCounts(rows);
}
