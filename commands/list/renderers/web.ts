import type { WebAction, WebNode, WebNodeRoot } from '@src/web/ui-schema';

import type { BmListRepresentation } from '../representation/schema';

type BmListItem = BmListRepresentation['data']['items'][number];

type CategoryTreeNode = {
  name: string;
  path: string;
  children: Map<string, CategoryTreeNode>;
  items: BmListItem[];
};

type BookmarkRowRenderProps = {
  representation: BmListRepresentation;
  item: BmListItem;
  showCategory: boolean;
};

const bmListStylesheet = {
  id: 'bm-list-web',
  cssText: `
    .web-stack.bm-list-layout {
      gap: 0.5rem;
    }

    .web-tree.bm-list-tree {
      gap: 0.4rem;
    }

    .web-treeItem.bm-list-category {
      gap: 0.3rem;
      padding: 0.3rem 0;
      border-bottom: 1px solid var(--color-border, currentColor);
    }

    .web-treeItem.bm-list-category:last-child {
      border-bottom: none;
    }

    .web-stack.bm-list-category-children {
      gap: 0.35rem;
      margin-left: 0.75rem;
      padding-left: 0.5rem;
      border-left: 1px solid var(--color-border, currentColor);
    }

    .web-treeItem.bm-list-category > .web-tree-item-summary {
      cursor: pointer;
    }

    .web-row.bm-list-category-summary {
      align-items: center;
      gap: 0.35rem;
      padding: 0.15rem 0.25rem;
    }

    .web-row.bm-list-item-row {
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.4rem;
      padding: 0.25rem 0.25rem;
    }

    .web-stack.bm-list-item-main {
      flex: 1;
      min-width: 0;
      gap: 0.2rem;
    }

    .web-row.bm-list-item-title-row {
      align-items: baseline;
      gap: 0.35rem;
    }

    .web-text.bm-list-id {
      flex-shrink: 0;
      font-size: 0.75rem;
    }

    .web-link.bm-list-url {
      overflow-wrap: anywhere;
      word-break: break-all;
      font-size: 0.8125rem;
    }

    .web-row.bm-list-meta {
      align-items: center;
      gap: 0.35rem;
      margin-top: 0.1rem;
    }

    .web-badge.bm-media-badge {
      color: var(--color-warning);
    }

  `,
} as const;

function mediaTypeLabel(mediaType: string): string {
  const normalized = mediaType.trim().toLowerCase();

  if (normalized === 'read') {
    return `📖 ${mediaType}`;
  }

  if (normalized === 'watch') {
    return `🎥 ${mediaType}`;
  }

  return mediaType;
}

function listRefresh(representation: BmListRepresentation) {
  const effectiveBy = representation.data.groupBy ?? 'cats';

  return {
    command: representation.meta.command,
    subcommand: 'list',
    arguments: { ...representation.data.listInvocation.arguments },
    options: {
      ...representation.data.listInvocation.options,
      by: effectiveBy,
    },
  };
}

function showBookmarkAction(
  representation: BmListRepresentation,
  id: number,
): WebAction {
  return {
    type: 'command',
    command: representation.meta.command,
    subcommand: 'show',
    arguments: { id },
    options: {},
    recordInTimeline: true,
  };
}

function queueBookmarkAction(
  representation: BmListRepresentation,
  id: number,
): WebAction {
  return {
    type: 'command',
    command: representation.meta.command,
    subcommand: 'queue',
    arguments: { id },
    options: {},
    refresh: listRefresh(representation),
  };
}

function doneBookmarkAction(
  representation: BmListRepresentation,
  id: number,
): WebAction {
  return {
    type: 'command',
    command: representation.meta.command,
    subcommand: 'done',
    arguments: { id },
    options: {},
    refresh: listRefresh(representation),
  };
}

function buildListAiCommandForm(representation: BmListRepresentation): WebNode {
  const refresh = listRefresh(representation);

  return {
    type: 'element',
    tag: 'form',
    props: {
      className: 'web-form web-form--stacked web-form--ai-prompt',
      action: {
        type: 'command',
        command: representation.meta.command,
        subcommand: 'ai',
        arguments: { prompt: '' },
        options: {},
        recordInTimeline: true,
        refresh,
      },
    },
    children: [
      {
        type: 'element',
        tag: 'textField',
        props: {
          formFieldName: 'prompt',
          inputPlaceholder:
            'Add, find, or edit bookmarks using a prompt or URL',
          storyTargetId: 'bm-ai-prompt-text',
        },
      },
      {
        type: 'element',
        tag: 'row',
        props: { className: 'web-form__actions' },
        children: [
          {
            type: 'element',
            tag: 'button',
            props: {
              label: 'Run AI',
              htmlType: 'submit',
              storyTargetId: 'bm-ai-prompt-submit',
            },
          },
        ],
      },
    ],
  };
}

function bookmarkUrlLabel(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    const path = parsed.pathname === '/' ? '' : parsed.pathname;
    const value = `${host}${path}`;

    return value.length > 72 ? `${value.slice(0, 71)}...` : value;
  } catch {
    return url.length > 72 ? `${url.slice(0, 71)}...` : url;
  }
}

function makeCategoryNode(name: string, path: string): CategoryTreeNode {
  return {
    name,
    path,
    children: new Map(),
    items: [],
  };
}

function insertIntoCategoryTree(
  root: CategoryTreeNode,
  item: BmListItem,
): void {
  const segments = item.category
    .split('/')
    .filter((segment) => segment.length > 0);

  let node = root;
  let path = '';

  for (const segment of segments) {
    path = path.length === 0 ? segment : `${path}/${segment}`;
    let child = node.children.get(segment);

    if (!child) {
      child = makeCategoryNode(segment, path);
      node.children.set(segment, child);
    }

    node = child;
  }

  node.items.push(item);
}

function countCategoryItems(node: CategoryTreeNode): number {
  let count = node.items.length;

  for (const child of node.children.values()) {
    count += countCategoryItems(child);
  }

  return count;
}

function buildCategoryTree(items: BmListItem[]): CategoryTreeNode[] {
  const root = makeCategoryNode('', '');

  for (const item of items) {
    insertIntoCategoryTree(root, item);
  }

  return [...root.children.values()].sort((a, b) =>
    a.path.localeCompare(b.path),
  );
}

function renderBookmarkRow({
  representation,
  item,
  showCategory,
}: BookmarkRowRenderProps): WebNode {
  const badges: WebNode[] = [
    {
      type: 'element',
      tag: 'badge',
      props: {
        label: mediaTypeLabel(item.media_type),
        className: 'bm-media-badge',
        size: 'sm',
      },
    },
  ];

  if (showCategory) {
    badges.push({
      type: 'element',
      tag: 'badge',
      props: { label: item.category, tone: 'muted', size: 'sm' },
    });
  }

  if (item.in_queue) {
    badges.push({
      type: 'element',
      tag: 'badge',
      props: { label: 'queued', tone: 'info', size: 'sm' },
    });
  }

  if (item.consumed_at !== null) {
    badges.push({
      type: 'element',
      tag: 'badge',
      props: { label: 'consumed', tone: 'success', size: 'sm' },
    });
  }

  const actions: WebNode[] = [
    {
      type: 'element',
      tag: 'menuItem',
      props: {
        label: 'Show',
        action: showBookmarkAction(representation, item.id),
      },
    },
  ];

  if (!item.in_queue && item.consumed_at === null) {
    actions.push({
      type: 'element',
      tag: 'menuItem',
      props: {
        label: 'Queue',
        action: queueBookmarkAction(representation, item.id),
      },
    });
  }

  if (item.consumed_at === null) {
    actions.push({
      type: 'element',
      tag: 'menuItem',
      props: {
        label: 'Done',
        action: doneBookmarkAction(representation, item.id),
      },
    });
  }

  return {
    type: 'element',
    tag: 'row',
    props: {
      gap: 'sm',
      className: 'bm-list-item-row',
      itemAlign: 'start',
    },
    children: [
      {
        type: 'element',
        tag: 'stack',
        props: {
          className: 'bm-list-item-main',
          gap: 'xs',
        },
        children: [
          {
            type: 'element',
            tag: 'row',
            props: {
              gap: 'xs',
              className: 'bm-list-item-title-row',
              itemAlign: 'baseline',
            },
            children: [
              {
                type: 'element',
                tag: 'link',
                props: {
                  href: item.url,
                  external: true,
                  weight: 'semibold',
                },
                children: [{ type: 'text', value: item.title }],
              },
              {
                type: 'element',
                tag: 'text',
                props: {
                  tone: 'muted',
                  size: 'sm',
                  className: 'bm-list-id',
                },
                children: [{ type: 'text', value: `#${item.id}` }],
              },
            ],
          },
          {
            type: 'element',
            tag: 'link',
            props: {
              href: item.url,
              external: true,
              tone: 'muted',
              size: 'sm',
              className: 'bm-list-url',
            },
            children: [{ type: 'text', value: bookmarkUrlLabel(item.url) }],
          },
          {
            type: 'element',
            tag: 'row',
            props: {
              gap: 'xs',
              className: 'bm-list-meta',
              itemAlign: 'center',
            },
            children: badges,
          },
        ],
      },
      {
        type: 'element',
        tag: 'overflowMenu',
        props: {
          label: '\u22EE',
          buttonVariant: 'icon',
        },
        children: actions,
      },
    ],
  };
}

function bookmarkFilterText(item: BmListItem): string {
  return [
    item.title,
    item.url,
    item.category,
    item.tags,
    item.media_type,
    item.description,
    item.summary,
    `#${item.id}`,
  ]
    .filter(
      (value): value is string => typeof value === 'string' && value.length > 0,
    )
    .join('\n');
}

function renderBookmarkTreeItem(props: BookmarkRowRenderProps): WebNode {
  const { item } = props;

  return {
    type: 'element',
    tag: 'treeItem',
    props: {
      id: `bm-list-item-${item.id}`,
      filterText: bookmarkFilterText(item),
      filterName: item.title,
      filterPath: item.category,
      defaultExpanded: false,
    },
    summary: renderBookmarkRow(props),
  };
}

function renderCategoryTreeItem(
  representation: BmListRepresentation,
  node: CategoryTreeNode,
): WebNode {
  const childCategories = [...node.children.values()].sort((a, b) =>
    a.path.localeCompare(b.path),
  );

  return {
    type: 'element',
    tag: 'treeItem',
    props: {
      id: `bm-list-category-${node.path}`,
      className: 'bm-list-category',
      filterText: node.path,
      filterName: node.name,
      filterPath: node.path,
      defaultExpanded: false,
    },
    summary: {
      type: 'element',
      tag: 'row',
      props: {
        className: 'bm-list-category-summary',
        gap: 'sm',
        itemAlign: 'center',
      },
      children: [
        {
          type: 'element',
          tag: 'text',
          props: { weight: 'bold', size: 'lg' },
          children: [{ type: 'text', value: node.name }],
        },
        {
          type: 'element',
          tag: 'badge',
          props: {
            label: `${countCategoryItems(node)} items`,
            tone: 'info',
            size: 'sm',
          },
        },
      ],
    },
    children: [
      {
        type: 'element',
        tag: 'stack',
        props: {
          className: 'bm-list-category-children',
          gap: 'xs',
        },
        children: [
          ...node.items.map((item) =>
            renderBookmarkTreeItem({
              representation,
              item,
              showCategory: false,
            }),
          ),
          ...childCategories.map((child) =>
            renderCategoryTreeItem(representation, child),
          ),
        ],
      },
    ],
  };
}

export function renderListWeb(
  representation: BmListRepresentation,
): WebNodeRoot {
  const effectiveGroupBy = representation.data.groupBy ?? 'cats';

  const children: WebNode[] =
    effectiveGroupBy === 'cats'
      ? [
          {
            type: 'element',
            tag: 'tree',
            props: {
              gap: 'xs',
              className: 'bm-list-tree',
              filterable: true,
              filterPlaceholder: 'Filter bookmarks',
            },
            children: buildCategoryTree(representation.data.items).map((node) =>
              renderCategoryTreeItem(representation, node),
            ),
          },
        ]
      : [
          {
            type: 'element',
            tag: 'tree',
            props: {
              gap: 'xs',
              className: 'bm-list-tree',
              filterable: true,
              filterPlaceholder: 'Filter bookmarks',
            },
            children: representation.data.items.map((item) =>
              renderBookmarkTreeItem({
                representation,
                item,
                showCategory: true,
              }),
            ),
          },
        ];

  return {
    kind: 'ui',
    version: 1,
    meta: representation.meta,
    tree: {
      type: 'element',
      tag: 'stack',
      props: { gap: 'md', className: 'bm-list-layout' },
      children: [buildListAiCommandForm(representation), ...children],
    },
    stylesheets: [bmListStylesheet],
  };
}
