// ---------------------------------------------------------------------------
// plugins/bm/commands/next-args.ts — Parse !bm next [media_type] [flags]
// ---------------------------------------------------------------------------
import { normalizeMediaTypeFilter } from '../types';

export type BmNextCliFilters = {
  media_type: string | null;
  tags_all: string[] | null;
  category: string | null;
};

type ParseBmNextCliArgsResult =
  | { ok: true; filters: BmNextCliFilters }
  | { ok: false; error: string };

type ParseBmNextCliArgsProps = {
  rest: string[];
  prefix: string;
  alias: string;
};

function nextValue(args: string[], i: number): string | null {
  const v = args[i + 1];

  if (v === undefined || v.startsWith('-')) {
    return null;
  }

  return v;
}

export function parseBmNextCliArgs({
  rest,
  prefix,
  alias,
}: ParseBmNextCliArgsProps): ParseBmNextCliArgsResult {
  const tagsAccum: string[] = [];
  let category: string | null = null;
  let mediaTypeRaw: string | null = null;

  let i = 0;

  if (rest.length > 0 && !rest[0]!.startsWith('-')) {
    mediaTypeRaw = rest[0]!.trim();
    i = 1;
  }

  for (; i < rest.length; i++) {
    const a = rest[i]!;

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

    if (a.startsWith('-')) {
      return { ok: false, error: `Unknown flag: ${a}` };
    }

    return {
      ok: false,
      error: `Unexpected argument: ${a}. See ${prefix}${alias} help next.`,
    };
  }

  return {
    ok: true,
    filters: {
      media_type: normalizeMediaTypeFilter(mediaTypeRaw),
      tags_all: tagsAccum.length > 0 ? tagsAccum : null,
      category,
    },
  };
}
