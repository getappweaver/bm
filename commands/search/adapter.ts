import type { BmCommandAdapter } from '../../adapter';
import { getBm } from '../../db';
import { listDrafts } from '../../drafts';
import { BM_LIST_FILTERS_NONE } from '../../types';

import { renderDraftsWeb } from '../drafts/renderers/web';
import { handleListCommand } from '../list/handler';
import { renderListWeb } from '../list/renderers/web';
import { createListRepresentation } from '../list/representation/builder';

import { handleSearchCommandResult } from './handler';
import { getBmNip50RelaySupport } from './nip50';

export const adaptSearchCommand: BmCommandAdapter = async (params) => {
  const result = await handleSearchCommandResult(params);

  if (
    params.source === 'web' &&
    result.type === 'text' &&
    params.rest[0]?.toLowerCase() === 'import' &&
    result.text.startsWith('Draft #')
  ) {
    return renderDraftsWeb({
      command: params.identity.alias,
      drafts: listDrafts(params.db),
      getBookmarkById: (id) => getBm(params.db, id),
    });
  }

  if (params.source !== 'web' || result.type !== 'session') {
    return result.text;
  }

  const listResult = handleListCommand({
    db: params.db,
    filters: BM_LIST_FILTERS_NONE,
    groupBy: 'cats',
  });

  const representation = createListRepresentation({
    command: params.identity.alias,
    subcommand: 'list',
    groupBy: listResult.groupBy,
    listInvocation: {
      arguments: {},
      options: { by: 'cats' },
    },
    items: listResult.items,
  });

  return renderListWeb(representation, {
    activeTabId: 'bm-search',
    searchSession: result.session,
    nip50RelaySupport: await getBmNip50RelaySupport({
      pool: params.pool,
      masterPubkey: params.masterPubkey,
      relays: result.session.filters.relays,
    }),
  });
};
