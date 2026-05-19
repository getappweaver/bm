import type { HandleBmCommandProps } from '../../../command-context';

import type { SearchPageOptions } from '../page-options';
import type { SearchCommandResult } from '../result';
import { getSearchSessionPage } from '../search';
import {
  getBmLastSearchSession,
  updateBmSearchSessionPage,
} from '../search-session';

type SearchNextCommandProps = {
  cmd: HandleBmCommandProps;
  pageOptions: SearchPageOptions;
};

export function handleSearchNextCommand(
  props: SearchNextCommandProps,
): SearchCommandResult {
  const { cmd, pageOptions } = props;
  const { db, identity, prefix } = cmd;
  const alias = identity.alias;
  const lastSearchSession = getBmLastSearchSession(db);

  if (!lastSearchSession) {
    return {
      type: 'text',
      text: `No previous published bookmark search. Run \`${prefix}${alias} search ...\` first.`,
    };
  }

  const nextPage = lastSearchSession.page + 1;

  const updatedSession = updateBmSearchSessionPage(
    db,
    lastSearchSession,
    nextPage,
  );

  return {
    type: 'session',
    session: updatedSession,
    text: getSearchSessionPage(updatedSession, nextPage, pageOptions),
  };
}
