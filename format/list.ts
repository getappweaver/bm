// ---------------------------------------------------------------------------
// plugins/bm/format/list.ts — list cards + category tree (!bm list)
// ---------------------------------------------------------------------------

import type { Bm } from '../types';

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

type CategoryTreeNode = {
  children: Map<string, CategoryTreeNode>;
  items: Bm[];
};

function makeCategoryTreeNode(): CategoryTreeNode {
  return { children: new Map(), items: [] };
}

function insertIntoCategoryTree(root: CategoryTreeNode, bm: Bm): void {
  const segments = bm.category.split('/').filter((s) => s.length > 0);
  let node = root;

  for (const seg of segments) {
    let child = node.children.get(seg);

    if (!child) {
      child = makeCategoryTreeNode();
      node.children.set(seg, child);
    }

    node = child;
  }

  node.items.push(bm);
}

function renderCategoryTreeNode(
  lines: string[],
  node: CategoryTreeNode,
  label: string,
  depth: number,
): void {
  const indent = '  '.repeat(depth);
  const childIndent = '  '.repeat(depth + 1);
  const urlIndent = '  '.repeat(depth + 2);

  lines.push(`${indent}${label}/`);

  for (const bm of node.items) {
    const queueBit = bm.in_queue ? ' · Q' : '';

    lines.push(
      `${childIndent}#${bm.id} ${clipEnd(bm.title, BM_LIST_TITLE_MAX)}${queueBit}`,
    );

    lines.push(`${urlIndent}▸ ${clipUrlForList(bm.url)}`);
  }

  const sortedChildren = [...node.children.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  );

  for (const [childLabel, childNode] of sortedChildren) {
    renderCategoryTreeNode(lines, childNode, childLabel, depth + 1);
  }
}

export function formatBmsByCategory(items: Bm[]): string {
  if (items.length === 0) {
    return 'No bookmarks.';
  }

  const root = makeCategoryTreeNode();

  for (const bm of items) {
    insertIntoCategoryTree(root, bm);
  }

  const header = `${items.length} bookmark${items.length === 1 ? '' : 's'} by category`;
  const lines: string[] = [header, ''];

  const sortedRoots = [...root.children.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  );

  for (const [label, node] of sortedRoots) {
    renderCategoryTreeNode(lines, node, label, 0);
  }

  return lines.join('\n');
}
