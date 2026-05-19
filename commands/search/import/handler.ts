import type { HandleBmCommandProps } from '../../../command-context';
import { createBm, getBmByUrl } from '../../../db';
import { formatBmDetail } from '../../../format';
import { normalizeImportBmInput } from '../../../types';

import type { SearchCommandResult } from '../result';
import {
  buildImportedPublishedMeta,
  buildRawBookmarkInput,
  createDraftFromSearchResult,
  formatExistingBookmarkForDuplicate,
} from '../search-import';
import {
  getBmLastSearchSession,
  getBmSearchResultByDisplayIndex,
} from '../search-session';

export async function handleSearchImportCommand(
  cmd: HandleBmCommandProps,
): Promise<SearchCommandResult> {
  const { db, identity, prefix, pool, masterPubkey, runAgent, rest } = cmd;
  const alias = identity.alias;
  const idRaw = rest[1]?.trim();

  if (!idRaw) {
    return {
      type: 'text',
      text: `Usage: ${prefix}${alias} search import <id> [--raw]`,
    };
  }

  const id = parseInt(idRaw, 10);

  if (Number.isNaN(id) || id <= 0) {
    return {
      type: 'text',
      text: `Usage: ${prefix}${alias} search import <id> [--raw]`,
    };
  }

  const result = getBmSearchResultByDisplayIndex(
    id,
    getBmLastSearchSession(db),
  );

  if (!result) {
    return {
      type: 'text',
      text: `Search result not found: ${id}. Run ${prefix}${alias} search ... first, or choose an id from the latest search.`,
    };
  }

  if (rest.includes('--raw')) {
    const input = normalizeImportBmInput({
      ...buildRawBookmarkInput(result),
      ...(await buildImportedPublishedMeta({ result, pool, masterPubkey })),
    });

    const existing = getBmByUrl(db, input.url);

    if (existing) {
      return {
        type: 'text',
        text: formatExistingBookmarkForDuplicate({
          existing,
          displayIndex: id,
        }),
      };
    }

    const created = createBm(db, input);

    return {
      type: 'text',
      text: `Created #${created.id} from search result ${id}\n${formatBmDetail(created)}`,
    };
  }

  if (!runAgent) {
    return {
      type: 'text',
      text: `${prefix}${alias} search import ${id} requires an agent backend. Use ${prefix}${alias} search import ${id} --raw instead.`,
    };
  }

  return {
    type: 'text',
    text: await createDraftFromSearchResult({
      result,
      displayIndex: id,
      runAgent,
      db,
      alias,
      prefix,
      pool,
      masterPubkey,
    }),
  };
}
