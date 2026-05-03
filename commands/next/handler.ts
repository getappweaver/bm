// ---------------------------------------------------------------------------
// plugins/bm/commands/next/handler.ts
// ---------------------------------------------------------------------------

import type { HandleBmCommandProps } from '../../command-context';
import { getNextBm } from '../../db';
import { formatBmDetail } from '../../format';

import { parseBmNextCliArgs } from '../next-args';

export function handleNextCommand(cmd: HandleBmCommandProps): string {
  const { db, rest, prefix, identity } = cmd;

  const parsed = parseBmNextCliArgs({
    rest,
    prefix,
    alias: identity.alias,
  });

  if (!parsed.ok) {
    return parsed.error;
  }

  const { bm, fromQueue } = getNextBm({
    db,
    mediaType: parsed.filters.media_type,
    tags_all: parsed.filters.tags_all,
    category: parsed.filters.category,
  });

  if (!bm) {
    return 'No matching unconsumed bookmarks for these filters.';
  }

  if (!fromQueue) {
    return [
      'No queued unconsumed bookmarks matched; showing oldest unconsumed match (not in queue):',
      '',
      formatBmDetail(bm),
    ].join('\n');
  }

  return ['Next:', '', formatBmDetail(bm)].join('\n');
}
