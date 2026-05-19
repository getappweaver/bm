import type { BmCommandAdapter } from '../../adapter';

import { parseBmListCliArgs } from '../list-args';
import { getBmNip50RelaySupport } from '../search/nip50';
import { getBmLastSearchSession } from '../search/search-session';

import { handleListCommand } from './handler';
import { renderListText } from './renderers/text';
import { renderListWeb } from './renderers/web';
import { createListRepresentation } from './representation/builder';

export const adaptListCommand: BmCommandAdapter = async (params) => {
  const parsed = parseBmListCliArgs({
    rest: params.rest,
    prefix: params.prefix,
    alias: params.identity.alias,
  });

  if (!parsed.ok) {
    return parsed.error;
  }

  const result = handleListCommand({
    db: params.db,
    filters: parsed.filters,
    groupBy: parsed.groupBy,
  });

  if (result.type === 'empty') {
    return 'No bookmarks.';
  }

  const representation = createListRepresentation({
    command: params.identity.alias,
    subcommand: 'list',
    groupBy: result.groupBy,
    listInvocation: {
      arguments: {},
      options: {
        by: parsed.groupBy,
        queued: parsed.filters.in_queue === true,
        'no-queued': parsed.filters.in_queue === false,
        unconsumed: parsed.filters.consumed === false,
        consumed: parsed.filters.consumed === true,
        type: parsed.filters.media_type,
        tags: parsed.filters.tags_all,
        category: parsed.filters.category,
        title: parsed.filters.title_contains,
        url: parsed.filters.url_contains,
      },
    },
    items: result.items,
  });

  if (params.source === 'web') {
    const searchSession = getBmLastSearchSession(params.db);

    return renderListWeb(representation, {
      activeTabId: 'bm-local',
      searchSession,
      nip50RelaySupport: await getBmNip50RelaySupport({
        pool: params.pool,
        masterPubkey: params.masterPubkey,
        relays: searchSession?.filters.relays ?? [],
      }),
    });
  }

  return renderListText(representation);
};
