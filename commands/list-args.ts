// ---------------------------------------------------------------------------
// plugins/bm/list-args.ts — Parse !bm list CLI flags into BmListFilters
// ---------------------------------------------------------------------------
import type { BmListFilters } from '../types';
import { BM_LIST_FILTERS_NONE } from '../types';
import { normalizeMediaTypeFilter } from '../types';

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
  let inQueue: boolean | null = null;
  let consumed: boolean | null = null;
  let mediaType: string | null = null;

  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]!;

    if (a === '--queued') {
      if (inQueue === false) {
        return {
          ok: false,
          error: 'Conflicting flags: --queued and --no-queued.',
        };
      }

      inQueue = true;

      continue;
    }

    if (a === '--no-queued') {
      if (inQueue === true) {
        return {
          ok: false,
          error: 'Conflicting flags: --queued and --no-queued.',
        };
      }

      inQueue = false;

      continue;
    }

    if (a === '--unconsumed') {
      if (consumed === true) {
        return {
          ok: false,
          error: 'Conflicting flags: --unconsumed and --consumed.',
        };
      }

      consumed = false;

      continue;
    }

    if (a === '--consumed') {
      if (consumed === false) {
        return {
          ok: false,
          error: 'Conflicting flags: --unconsumed and --consumed.',
        };
      }

      consumed = true;

      continue;
    }

    if (a === '--type') {
      const v = nextValue(rest, i);

      if (v === null) {
        return { ok: false, error: 'Missing value for --type.' };
      }

      mediaType = v;
      i += 1;

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

  const mtNorm = normalizeMediaTypeFilter(mediaType);

  return {
    ok: true,
    filters: {
      tags_all: tagsAccum.length > 0 ? tagsAccum : null,
      category,
      title_contains: titleContains,
      url_contains: urlContains,
      in_queue: inQueue,
      consumed,
      media_type: mtNorm,
    },
  };
}
