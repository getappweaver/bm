// ---------------------------------------------------------------------------
// plugins/bm/format/detail.ts — single bookmark + update draft diff
// ---------------------------------------------------------------------------

import type { Bm, UpdateBmInput } from '../types';

type BmTagCountRow = {
  tag: string;
  count: number;
};

export function formatUpdateDraftList(
  existing: Bm,
  input: UpdateBmInput,
): string {
  const lines: string[] = [];
  const changed: string[] = [];

  const UPDATABLE_FIELDS = [
    'url',
    'title',
    'summary',
    'description',
    'category',
    'tags',
    'media_type',
    'in_queue',
  ] as const;

  for (const field of UPDATABLE_FIELDS) {
    if (field in input && input[field] !== undefined) {
      const prev = String(existing[field] ?? '—');
      const next = String(input[field] ?? '—');

      if (field === 'in_queue') {
        const prevStr = existing.in_queue ? 'yes' : 'no';
        const nextStr = input.in_queue ? 'yes' : 'no';

        if (prevStr !== nextStr) {
          changed.push(`  ${field}: ${prevStr} → ${nextStr}`);
        } else {
          lines.push(`  ${field}: ${prevStr} (unchanged)`);
        }
      } else if (prev !== next) {
        changed.push(`  ${field}: ${prev} → ${next}`);
      } else {
        lines.push(`  ${field}: ${prev} (unchanged)`);
      }
    }
  }

  return [`#${existing.id}: ${existing.title}`, ...changed, ...lines].join(
    '\n',
  );
}

type FormatBmDetailOptions = {
  tagCounts: BmTagCountRow[];
};

function formatTagsWithCounts(
  rawTags: string,
  options: FormatBmDetailOptions | undefined,
): string {
  if (options === undefined) {
    return rawTags;
  }

  const lookup = new Map(options.tagCounts.map((row) => [row.tag, row.count]));
  const formatted: string[] = [];

  for (const token of rawTags.split(',')) {
    const tag = token.trim().toLowerCase();

    if (tag.length === 0) {
      continue;
    }

    formatted.push(`${tag} (${lookup.get(tag) ?? 1})`);
  }

  return formatted.join(', ');
}

export function formatBmDetail(t: Bm, options?: FormatBmDetailOptions): string {
  return [
    `ID:          ${t.id}`,
    `URL:         ${t.url}`,
    `Title:       ${t.title}`,
    `Summary:     ${t.summary ?? '—'}`,
    `Description: ${t.description ?? '—'}`,
    `Category:    ${t.category}`,
    `Tags:        ${formatTagsWithCounts(t.tags, options)}`,
    `Media type:  ${t.media_type}`,
    `In queue:    ${t.in_queue ? 'yes' : 'no'}`,
    `Consumed:    ${t.consumed_at ? new Date(t.consumed_at).toLocaleString() : '—'}`,
    `Created:     ${new Date(t.created_at).toLocaleString()}`,
    `Nostr addr:  ${t.nostr_naddr ?? '—'}`,
    `Published:   ${t.published_at ? new Date(t.published_at).toLocaleString() : '—'}`,
  ].join('\n');
}
