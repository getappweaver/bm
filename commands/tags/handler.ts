// ---------------------------------------------------------------------------
// plugins/bm/commands/tags/handler.ts
// ---------------------------------------------------------------------------

import type { HandleBmCommandProps } from '../../command-context';
import { listBmTagCounts } from '../../db';
import { formatBmTagCounts } from '../../format';

export function handleTagsCommand(cmd: HandleBmCommandProps): string {
  const { db, rest, identity, prefix } = cmd;
  const alias = identity.alias;

  if (rest.length > 0) {
    return `Usage: ${prefix}${alias} tags`;
  }

  const rows = listBmTagCounts(db);

  return rows.length === 0 ? 'No tags yet.' : formatBmTagCounts(rows);
}
