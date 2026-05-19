import type { HandleBmCommandProps } from '../../../command-context';

import type { SearchPageOptions } from '../page-options';
import type { SearchCommandResult } from '../result';
import { getSearchSessionPage, searchHashtagPublishedBms } from '../search';
import type { BmSearchFilters } from '../search-args';
import { createBmSearchSession } from '../search-session';

type HashtagSearchCommandProps = {
  cmd: HandleBmCommandProps;
  filters: BmSearchFilters;
  pageOptions: SearchPageOptions;
};

export async function handleHashtagSearchCommand(
  props: HashtagSearchCommandProps,
): Promise<SearchCommandResult> {
  const { cmd, filters, pageOptions } = props;

  const session = await searchHashtagPublishedBms({
    filters,
    pool: cmd.pool,
    masterPubkey: cmd.masterPubkey,
    getWotScore: cmd.getWotScore,
  });

  if (!session) {
    return { type: 'text', text: 'No published bookmarks matched.' };
  }

  const storedSession = createBmSearchSession(cmd.db, session);

  return {
    type: 'session',
    session: storedSession,
    text: getSearchSessionPage(storedSession, 1, pageOptions),
  };
}
