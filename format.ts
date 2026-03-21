// ---------------------------------------------------------------------------
// plugins/bm/format.ts — Display helpers for bookmarks
// ---------------------------------------------------------------------------
import type {
  Bm,
  BmCategoryCount,
  BmMediaTypeCount,
  BmTagCount,
  CreateBmDraft,
} from './types';

export function hasDraftChildren(_node: CreateBmDraft): boolean {
  return false;
}

export function formatDraftReply(
  cmd: string,
  id: number,
  kind: 'create' | 'update' | 'delete',
  blockPrefix: string = '',
): string {
  const pad = blockPrefix + '  ';
  const first = blockPrefix + 'Reply: ';

  if (kind === 'delete') {
    return `${first}${cmd} accept ${id}\n${pad}${cmd} decline ${id}`;
  }

  return `${first}${cmd} accept ${id}\n${pad}${cmd} revise ${id} <corrections>\n${pad}${cmd} decline ${id}`;
}

export function formatCreateDraftList(node: CreateBmDraft): string {
  const lines = [`  URL:  ${node.url}`, `  Title: ${node.title}`];

  if (node.summary) {
    lines.push(`  Summary: ${node.summary}`);
  }

  if (node.description) {
    lines.push(`  Description: ${node.description}`);
  }

  lines.push(`  Category: ${node.category}`);
  lines.push(`  Tags: ${node.tags}`);
  lines.push(`  Media type: ${node.media_type}`);
  lines.push(`  In queue: ${node.in_queue ? 'yes' : 'no'}`);

  return lines.join('\n');
}

export function formatBmTagCounts(rows: BmTagCount[]): string {
  return rows.map((r) => `  ${r.tag}  ${r.count}`).join('\n');
}

export function formatBmCategoryCounts(rows: BmCategoryCount[]): string {
  return rows.map((r) => `  ${r.category}  ${r.count}`).join('\n');
}

export function formatBmMediaTypeCounts(rows: BmMediaTypeCount[]): string {
  return rows.map((r) => `  ${r.media_type}  ${r.count}`).join('\n');
}

// ---------------------------------------------------------------------------
// List view: scannable cards; full text stays on `!bm show <id>`
// ---------------------------------------------------------------------------

const BM_LIST_SEP = '────────────────────';

const BM_LIST_TITLE_MAX = 120;
const BM_LIST_URL_MAX = 58;
const BM_LIST_TAGS_MAX = 100;
const BM_LIST_NOTE_MAX = 220;

function clipEnd(text: string, max: number): string {
  const t = text.trim();

  if (t.length <= max) {
    return t;
  }

  return `${t.slice(0, max - 1)}…`;
}

function clipUrlForList(url: string): string {
  if (url.length <= BM_LIST_URL_MAX) {
    return url;
  }

  const head = 28;
  const tail = 22;

  return `${url.slice(0, head)}…${url.slice(-tail)}`;
}

export type FormatBmsOpts = {
  /** True when results were widened after an empty in-queue pass (AI list only). */
  expandedFromQueue?: boolean;
};

export function formatBms(items: Bm[], opts?: FormatBmsOpts): string {
  if (items.length === 0) {
    return 'No bookmarks.';
  }

  const header = `${items.length} bookmark${items.length === 1 ? '' : 's'}`;

  const cards = items.map((t) => {
    const queueBit = t.in_queue ? ' · queued' : '';
    const meta = `#${t.id} · ${t.media_type}${queueBit}`;
    const title = clipEnd(t.title, BM_LIST_TITLE_MAX);

    const lines: string[] = [
      BM_LIST_SEP,
      meta,
      title,
      '',
      `  ▸ ${clipUrlForList(t.url)}`,
      `  category  ${t.category}`,
      `  tags      ${clipEnd(t.tags, BM_LIST_TAGS_MAX)}`,
    ];

    if (t.description != null && t.description.trim() !== '') {
      lines.push(`  note      ${clipEnd(t.description, BM_LIST_NOTE_MAX)}`);
    }

    return lines.join('\n');
  });

  const topParts: string[] = [header];

  if (opts?.expandedFromQueue) {
    topParts.push(
      'No matches in queue — showing unconsumed bookmarks outside the queue.',
    );
  }

  topParts.push(cards.join('\n\n'));

  return topParts.join('\n\n');
}

export function formatBmDetail(t: Bm): string {
  return [
    `ID:          ${t.id}`,
    `URL:         ${t.url}`,
    `Title:       ${t.title}`,
    `Summary:     ${t.summary ?? '—'}`,
    `Description: ${t.description ?? '—'}`,
    `Category:    ${t.category}`,
    `Tags:        ${t.tags}`,
    `Media type:  ${t.media_type}`,
    `In queue:    ${t.in_queue ? 'yes' : 'no'}`,
    `Consumed:    ${t.consumed_at ? new Date(t.consumed_at).toLocaleString() : '—'}`,
    `Created:     ${new Date(t.created_at).toLocaleString()}`,
  ].join('\n');
}
