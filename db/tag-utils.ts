// ---------------------------------------------------------------------------
// plugins/bm/db/tag-utils.ts — comma-separated tag parsing
// ---------------------------------------------------------------------------

export function parseTagTokens(tags: string | null): Set<string> {
  const set = new Set<string>();

  if (!tags) {
    return set;
  }

  for (const raw of tags.split(',')) {
    const t = raw.trim().toLowerCase();

    if (t) {
      set.add(t);
    }
  }

  return set;
}
