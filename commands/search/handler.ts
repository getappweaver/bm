// ---------------------------------------------------------------------------
// plugins/bm/commands/search/handler.ts — !bm search …
// ---------------------------------------------------------------------------

import type { HandleBmCommandProps } from '../../command-context';
import { createBm, getBmByUrl } from '../../db';
import { formatBmDetail } from '../../format';
import { normalizeImportBmInput } from '../../types';

import { getSearchSessionPage, searchPublishedBms } from './search';
import { parseBmSearchCliArgs } from './search-args';
import {
  buildImportedPublishedMeta,
  buildRawBookmarkInput,
  createDraftFromSearchResult,
  formatExistingBookmarkForDuplicate,
} from './search-import';
import {
  createBmSearchSession,
  getBmLastSearchSession,
  getBmSearchResultByDisplayIndex,
  updateBmSearchSessionPage,
} from './search-session';

export async function handleSearchCommand(
  cmd: HandleBmCommandProps,
): Promise<string> {
  const {
    db,
    identity,
    prefix,
    pool,
    masterPubkey,
    getWotScore,
    runAgent,
    helpText,
    rest,
  } = cmd;

  const alias = identity.alias;

  const searchPageOptions = {
    commandPrefix: prefix,
    pluginAlias: alias,
  };

  if (rest.length === 0) {
    return helpText(alias, prefix)
      .filter((line) => line.includes(`${prefix}${alias} search`))
      .join('\n');
  }

  const searchSub = rest[0]?.toLowerCase();

  if (searchSub === 'import') {
    const idRaw = rest[1]?.trim();

    if (!idRaw) {
      return `Usage: ${prefix}${alias} search import <id> [--raw]`;
    }

    const id = parseInt(idRaw, 10);

    if (Number.isNaN(id) || id <= 0) {
      return `Usage: ${prefix}${alias} search import <id> [--raw]`;
    }

    const result = getBmSearchResultByDisplayIndex(
      id,
      getBmLastSearchSession(db),
    );

    if (!result) {
      return `Search result not found: ${id}. Run ${prefix}${alias} search ... first, or choose an id from the latest search.`;
    }

    if (rest.includes('--raw')) {
      const input = normalizeImportBmInput({
        ...buildRawBookmarkInput(result),
        ...(await buildImportedPublishedMeta({
          result,
          pool,
          masterPubkey,
        })),
      });

      const existing = getBmByUrl(db, input.url);

      if (existing) {
        return formatExistingBookmarkForDuplicate({
          existing,
          displayIndex: id,
        });
      }

      const created = createBm(db, input);

      return `Created #${created.id} from search result ${id}\n${formatBmDetail(created)}`;
    }

    if (!runAgent) {
      return `${prefix}${alias} search import ${id} requires an agent backend. Use ${prefix}${alias} search import ${id} --raw instead.`;
    }

    return createDraftFromSearchResult({
      result,
      displayIndex: id,
      runAgent,
      db,
      alias,
      prefix,
      pool,
      masterPubkey,
    });
  }

  if (searchSub === 'next' || searchSub === 'prev' || searchSub === 'page') {
    const lastSearchSession = getBmLastSearchSession(db);

    if (!lastSearchSession) {
      return `No previous published bookmark search. Run \`${prefix}${alias} search ...\` first.`;
    }

    if (searchSub === 'next') {
      const nextPage = lastSearchSession.page + 1;

      const updatedSession = updateBmSearchSessionPage(
        db,
        lastSearchSession,
        nextPage,
      );

      return getSearchSessionPage(updatedSession, nextPage, searchPageOptions);
    }

    if (searchSub === 'prev') {
      const prevPage = lastSearchSession.page - 1;

      const updatedSession = updateBmSearchSessionPage(
        db,
        lastSearchSession,
        prevPage,
      );

      return getSearchSessionPage(updatedSession, prevPage, searchPageOptions);
    }

    const pageRaw = rest[1]?.trim();

    if (!pageRaw) {
      return `Usage: ${prefix}${alias} search page <n>`;
    }

    const page = parseInt(pageRaw, 10);

    if (Number.isNaN(page) || page <= 0) {
      return `Usage: ${prefix}${alias} search page <n>`;
    }

    const updatedSession = updateBmSearchSessionPage(
      db,
      lastSearchSession,
      page,
    );

    return getSearchSessionPage(updatedSession, page, searchPageOptions);
  }

  const parsed = parseBmSearchCliArgs(rest);

  if (!parsed.ok) {
    return parsed.error;
  }

  const session = await searchPublishedBms({
    filters: parsed.filters,
    pool,
    masterPubkey,
    getWotScore,
  });

  if (!session) {
    return 'No published bookmarks matched.';
  }

  const storedSession = createBmSearchSession(db, session);

  return getSearchSessionPage(storedSession, 1, searchPageOptions);
}
