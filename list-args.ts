// ---------------------------------------------------------------------------
// plugins/bm/list-args.ts — Parse !bm list CLI flags into BmListFilters
// ---------------------------------------------------------------------------
import type { BmListFilters } from './types';
import { BM_LIST_FILTERS_NONE } from './types';

type ParseBmListCliArgsResult =
  | { ok: true; filters: BmListFilters }
  | { ok: false; error: string };

function nextValue(args: string[], i: number): string | null {
  const v = args[i + 1];

  if (v === undefined || v.startsWith('-')) {
    return null;
  }

  return v;
}

export function parseBmListCliArgs(rest: string[]): ParseBmListCliArgsResult {
  if (rest.length === 0) {
    return { ok: true, filters: BM_LIST_FILTERS_NONE };
  }

  const tagsAccum: string[] = [];
  let category: string | null = null;
  let titleContains: string | null = null;
  let urlContains: string | null = null;
  let toRead: boolean | null = null;

  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]!;

    if (a === '--to-read') {
      if (toRead === false) {
        return {
          ok: false,
          error: 'Conflicting flags: --to-read and --no-to-read.',
        };
      }

      toRead = true;

      continue;
    }

    if (a === '--no-to-read') {
      if (toRead === true) {
        return {
          ok: false,
          error: 'Conflicting flags: --to-read and --no-to-read.',
        };
      }

      toRead = false;

      continue;
    }

    if (a === '--tag') {
      const v = nextValue(rest, i);

      if (v === null) {
        return { ok: false, error: 'Missing value for --tag.' };
      }

      tagsAccum.push(v);
      i += 1;

      continue;
    }

    if (a === '--tags') {
      const v = nextValue(rest, i);

      if (v === null) {
        return { ok: false, error: 'Missing value for --tags.' };
      }

      for (const raw of v.split(',')) {
        const t = raw.trim();

        if (t) {
          tagsAccum.push(t);
        }
      }

      i += 1;

      continue;
    }

    if (a === '--category') {
      const v = nextValue(rest, i);

      if (v === null) {
        return { ok: false, error: 'Missing value for --category.' };
      }

      category = v;
      i += 1;

      continue;
    }

    if (a === '--title') {
      const v = nextValue(rest, i);

      if (v === null) {
        return { ok: false, error: 'Missing value for --title.' };
      }

      titleContains = v;
      i += 1;

      continue;
    }

    if (a === '--url') {
      const v = nextValue(rest, i);

      if (v === null) {
        return { ok: false, error: 'Missing value for --url.' };
      }

      urlContains = v;
      i += 1;

      continue;
    }

    if (a.startsWith('-')) {
      return { ok: false, error: `Unknown flag: ${a}` };
    }

    return {
      ok: false,
      error: `Unexpected argument: ${a}. Flags only; see !bm help.`,
    };
  }

  return {
    ok: true,
    filters: {
      tags_all: tagsAccum.length > 0 ? tagsAccum : null,
      category,
      title_contains: titleContains,
      url_contains: urlContains,
      to_read: toRead,
    },
  };
}
