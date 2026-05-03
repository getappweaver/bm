// ---------------------------------------------------------------------------
// plugins/bm/format/drafts-display.ts — draft previews + reply hints
// ---------------------------------------------------------------------------

import type { CreateBmDraft, ImportBmInput } from '../types';

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

export function formatCreateDraftList(
  node: CreateBmDraft | ImportBmInput,
): string {
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

  if ('nostr_naddr' in node && node.nostr_naddr) {
    lines.push(`  Nostr addr: ${node.nostr_naddr}`);
  }

  if ('published_at' in node && node.published_at) {
    lines.push(`  Published: ${new Date(node.published_at).toLocaleString()}`);
  }

  return lines.join('\n');
}
