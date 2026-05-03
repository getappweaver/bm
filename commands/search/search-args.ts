import { normalizeMediaTypeFilter } from '../../types';

export type BmSearchFilters = {
  title: string | null;
  tags_any: string[];
  category: string | null;
  media_type: string | null;
};

type ParseBmSearchCliArgsResult =
  | { ok: true; filters: BmSearchFilters }
  | { ok: false; error: string };

function nextValue(args: string[], i: number): string | null {
  const v = args[i + 1];

  if (v === undefined || v.startsWith('-')) {
    return null;
  }

  return v;
}

export function parseBmSearchCliArgs(
  rest: string[],
): ParseBmSearchCliArgsResult {
  const titleTokens: string[] = [];
  const tagsAccum: string[] = [];
  let category: string | null = null;
  let mediaType: string | null = null;

  for (let i = 0; i < rest.length; i += 1) {
    const a = rest[i]!;

    if (a === '--tag' || a === '-t') {
      const v = nextValue(rest, i);

      if (v === null) {
        return { ok: false, error: 'Missing value for --tag.' };
      }

      tagsAccum.push(v.trim().toLowerCase());
      i += 1;

      continue;
    }

    if (a === '--tags') {
      const v = nextValue(rest, i);

      if (v === null) {
        return { ok: false, error: 'Missing value for --tags.' };
      }

      for (const raw of v.split(',')) {
        const t = raw.trim().toLowerCase();

        if (t) {
          tagsAccum.push(t);
        }
      }

      i += 1;

      continue;
    }

    if (a === '--category' || a === '-c') {
      const v = nextValue(rest, i);

      if (v === null) {
        return { ok: false, error: 'Missing value for --category.' };
      }

      category = v.trim();
      i += 1;

      continue;
    }

    if (a === '--media' || a === '-m') {
      const v = nextValue(rest, i);

      if (v === null) {
        return { ok: false, error: 'Missing value for --media.' };
      }

      mediaType = v;
      i += 1;

      continue;
    }

    if (a.startsWith('-')) {
      return { ok: false, error: `Unknown flag: ${a}` };
    }

    titleTokens.push(a);
  }

  return {
    ok: true,
    filters: {
      title: titleTokens.length > 0 ? titleTokens.join(' ').trim() : null,
      tags_any: [...new Set(tagsAccum)],
      category,
      media_type: normalizeMediaTypeFilter(mediaType),
    },
  };
}
