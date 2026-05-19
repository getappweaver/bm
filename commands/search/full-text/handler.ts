import { debug } from '@src/logger';

import type { HandleBmCommandProps } from '../../../command-context';

import type { SearchPageOptions } from '../page-options';
import type { SearchCommandResult } from '../result';
import {
  createEmptyBmSearchSession,
  getSearchSessionPage,
  searchFullTextPublishedBms,
} from '../search';
import type { BmSearchFilters } from '../search-args';
import { createBmSearchSession } from '../search-session';

type FullTextSearchCommandProps = {
  cmd: HandleBmCommandProps;
  filters: BmSearchFilters;
  pageOptions: SearchPageOptions;
};

export async function handleFullTextSearchCommand(
  props: FullTextSearchCommandProps,
): Promise<SearchCommandResult> {
  const { cmd, filters, pageOptions } = props;

  debug('bm full-text search command', {
    query: filters.title,
    limit: filters.limit,
    clientRelayCount: filters.relays.length,
    clientRelays: filters.relays,
    category: filters.category,
    mediaType: filters.media_type,
  });

  const session = await searchFullTextPublishedBms({
    filters,
    pool: cmd.pool,
    masterPubkey: cmd.masterPubkey,
    getWotScore: cmd.getWotScore,
  });

  const storedSession = createBmSearchSession(
    cmd.db,
    session ?? createEmptyBmSearchSession(filters),
  );

  return {
    type: 'session',
    session: storedSession,
    text: getSearchSessionPage(storedSession, 1, pageOptions),
  };
}
