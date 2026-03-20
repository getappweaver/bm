// ---------------------------------------------------------------------------
// plugins/bm/format.ts — Display helpers for bookmarks
// ---------------------------------------------------------------------------
import type { Bm, BmCategoryCount, BmTagCount, CreateBmDraft } from './types';

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

  if (node.category) {
    lines.push(`  Category: ${node.category}`);
  }

  if (node.tags) {
    lines.push(`  Tags: ${node.tags}`);
  }

  if (node.to_read === true) {
    lines.push('  To read: yes');
  }

  return lines.join('\n');
}

export function formatBmTagCounts(rows: BmTagCount[]): string {
  return rows.map((r) => `  ${r.tag}  ${r.count}`).join('\n');
}

export function formatBmCategoryCounts(rows: BmCategoryCount[]): string {
  return rows.map((r) => `  ${r.category}  ${r.count}`).join('\n');
}

export function formatBms(items: Bm[]): string {
  if (items.length === 0) {
    return 'No bookmarks.';
  }

  return items
    .map((t) => {
      const mark = t.to_read ? '*' : ' ';

      return `  ${t.id}${mark} ${t.title}\n      ${t.url}`;
    })
    .join('\n');
}

export function formatBmDetail(t: Bm): string {
  return [
    `ID:          ${t.id}`,
    `URL:         ${t.url}`,
    `Title:       ${t.title}`,
    `Summary:     ${t.summary ?? '—'}`,
    `Description: ${t.description ?? '—'}`,
    `Category:    ${t.category ?? '—'}`,
    `Tags:        ${t.tags ?? '—'}`,
    `To read:     ${t.to_read ? 'yes' : 'no'}`,
    `Read:        ${t.read_at ? new Date(t.read_at).toLocaleString() : '—'}`,
    `Created:     ${new Date(t.created_at).toLocaleString()}`,
  ].join('\n');
}
