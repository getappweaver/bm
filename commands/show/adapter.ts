import type { BmCommandAdapter } from '../../adapter';
import { listBmTagCounts } from '../../db';
import { parseTagTokens } from '../../db/tag-utils';
import { formatBmDetail } from '../../format';

import { handleShowCommand } from './handler';
import { renderDetailWeb } from './renderers/web';
import { createDetailRepresentation } from './representation/builder';

export const adaptShowCommand: BmCommandAdapter = (params) => {
  const result = handleShowCommand(params);

  // If result is a string (error or usage), return it directly
  if (typeof result === 'string') {
    return result;
  }

  const representation = createDetailRepresentation({
    command: params.identity.alias,
    subcommand: 'show',
    bookmark: result,
  });

  const tagCountLookup = new Map(
    listBmTagCounts(params.db).map((row) => [row.tag, row.count] as const),
  );

  const tagCounts = [...parseTagTokens(result.tags)].map((tag) => ({
    tag,
    count: tagCountLookup.get(tag) ?? 1,
  }));

  if (params.source === 'web') {
    return renderDetailWeb(representation, { tagCounts });
  }

  return formatBmDetail(representation.data.bookmark, { tagCounts });
};
