// ---------------------------------------------------------------------------
// plugins/bm/commands/search/handler.ts — !bm search …
// ---------------------------------------------------------------------------

import type { HandleBmCommandProps } from '../../command-context';

import { handleFullTextSearchCommand } from './full-text/handler';
import { handleHashtagSearchCommand } from './hashtag/handler';
import { handleSearchImportCommand } from './import/handler';
import { handleSearchNextCommand } from './next/handler';
import { handleSearchPrevCommand } from './prev/handler';
import type { SearchCommandResult } from './result';
import { getSearchSessionPage } from './search';
import { parseBmSearchCliArgs } from './search-args';
import {
  getBmLastSearchSession,
  updateBmSearchSessionPage,
} from './search-session';

export type { SearchCommandResult } from './result';

function isFullTextSearchResult(filters: {
  title: string | null;
  tags_any: string[];
}): boolean {
  return filters.title !== null && filters.tags_any.length === 0;
}

export async function handleSearchCommand(
  cmd: HandleBmCommandProps,
): Promise<string> {
  const result = await handleSearchCommandResult(cmd);

  return result.text;
}

export async function handleSearchCommandResult(
  cmd: HandleBmCommandProps,
): Promise<SearchCommandResult> {
  const { db, identity, prefix, helpText, rest } = cmd;
  const alias = identity.alias;

  const searchPageOptions = {
    commandPrefix: prefix,
    pluginAlias: alias,
  };

  if (rest.length === 0) {
    return {
      type: 'text',
      text: helpText(alias, prefix)
        .filter((line) => line.includes(`${prefix}${alias} search`))
        .join('\n'),
    };
  }

  const searchSub = rest[0]?.toLowerCase();

  if (searchSub === 'import') {
    return handleSearchImportCommand(cmd);
  }

  if (searchSub === 'next') {
    return handleSearchNextCommand({ cmd, pageOptions: searchPageOptions });
  }

  if (searchSub === 'prev') {
    return handleSearchPrevCommand({ cmd, pageOptions: searchPageOptions });
  }

  if (searchSub === 'page') {
    const lastSearchSession = getBmLastSearchSession(db);
    const pageRaw = rest[1]?.trim();

    if (!lastSearchSession) {
      return {
        type: 'text',
        text: `No previous published bookmark search. Run \`${prefix}${alias} search ...\` first.`,
      };
    }

    if (!pageRaw) {
      return { type: 'text', text: `Usage: ${prefix}${alias} search page <n>` };
    }

    const page = parseInt(pageRaw, 10);

    if (Number.isNaN(page) || page <= 0) {
      return { type: 'text', text: `Usage: ${prefix}${alias} search page <n>` };
    }

    const updatedSession = updateBmSearchSessionPage(
      db,
      lastSearchSession,
      page,
    );

    return {
      type: 'session',
      session: updatedSession,
      text: getSearchSessionPage(updatedSession, page, searchPageOptions),
    };
  }

  const parsed = parseBmSearchCliArgs(rest);

  if (!parsed.ok) {
    return { type: 'text', text: parsed.error };
  }

  if (isFullTextSearchResult(parsed.filters)) {
    return handleFullTextSearchCommand({
      cmd,
      filters: parsed.filters,
      pageOptions: searchPageOptions,
    });
  }

  return handleHashtagSearchCommand({
    cmd,
    filters: parsed.filters,
    pageOptions: searchPageOptions,
  });
}
