// ---------------------------------------------------------------------------
// plugins/bm/format.ts — Display helpers for the bm plugin
//
// Replace with formatters for your entity and drafts, e.g.:
// - formatBmDetail(item) for !bm show <id>
// - formatBmTree(items) or list view for !bm list
// - formatCreateDraftTree(draft), formatDraftReply(cmd, id, kind) for draft UX
// - hasDraftChildren(draft) if you support nested/tree drafts
// ---------------------------------------------------------------------------
import type { CreateBmDraft, Bm } from './types';

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

export function formatCreateDraftTree(node: CreateBmDraft): string {
  return `  - ${node.data}`;
}

export function formatBmTree(items: Bm[], _showDescriptions?: boolean): string {
  if (items.length === 0) {
    return 'No bms.';
  }

  return items.map((t) => `  ${t.id} ${t.data}`).join('\n');
}

export function formatBmDetail(t: Bm): string {
  return [
    `ID:   ${t.id}`,
    `Data: ${t.data}`,
    `Created: ${new Date(t.created_at).toLocaleString()}`,
  ].join('\n');
}
