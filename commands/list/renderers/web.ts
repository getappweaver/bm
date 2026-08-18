import type { WebAction, WebNode, WebNodeRoot } from '@src/web/ui-schema';

import {
  KNOWN_MEDIA_TYPES,
  bookmarkFaviconNode,
  mediaTypeLabel,
} from '../../../format';

import { BM_BOOKMARK_KIND, getBookmarkIdentifier } from '../../publish/publish';
import type { BmNip50RelaySupport } from '../../search/nip50';
import {
  buildPublishedSearchResultsTree,
  buildPublishedSearchTabs,
  buildPublishedSearchPlaceholderTree,
} from '../../search/renderers/web';
import type { BmStoredSearchSession } from '../../search/search-session';

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

type RenderListWebOptions = {
  activeTabId: 'bm-local' | 'bm-search';
  searchSession: BmStoredSearchSession | null;
  nip50RelaySupport: BmNip50RelaySupport | null;
};

const PUBLISH_FALLBACK_RELAYS = ['wss://nos.lol', 'wss://relay.nostr.band'];

const BM_LIST_MEDIA_TYPE_FILTER_REVEAL_ID = 'bm-list-media-type-filter';

type BmToolbarAction = {
  label: string;
  icon:
    | 'add'
    | 'checklist'
    | 'copy'
    | 'diff'
    | 'edit'
    | 'log'
    | 'openTimeline'
    | 'save'
    | 'settings';
  action: WebAction;
};

const bmListStylesheet = {
  id: 'bm-list-web',
  cssText: `
    .web-stack.bm-list-layout {
      gap: 0.5rem;
    }

    .web-tabs.bm-list-tabs {
      display: grid;
      gap: 0;
    }

    .web-tabPanel.bm-list-tab-panel {
      display: grid;
      gap: 0.55rem;
      background: var(--color-panel);
    }

    .web-tree.bm-list-tree {
      gap: 0.4rem;
    }

    .web-tree.bm-search-tree {
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

    .web-row.bm-search-result-row {
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

    .web-stack.bm-search-result-main {
      flex: 1;
      min-width: 0;
      gap: 0.2rem;
    }

    .web-row.bm-list-item-title-row {
      align-items: baseline;
      gap: 0.35rem;
      flex-wrap: nowrap;
    }

    .web-row.bm-list-item-title-row .web-link {
      min-width: 0;
    }

    .web-row.bm-search-result-title-row {
      flex-wrap: nowrap;
    }

    .web-row.bm-search-result-title-row .web-link,
    .web-row.bm-search-result-title-row .web-text {
      min-width: 0;
    }

    .web-text.bm-list-id {
      flex-shrink: 0;
      font-size: 0.75rem;
    }

    .web-image.bm-favicon {
      width: 1rem;
      height: 1rem;
      flex-shrink: 0;
      align-self: flex-start;
      object-fit: contain;
      margin-top: 0.1rem;
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

    .web-row.bm-search-result-meta {
      align-items: center;
      gap: 0.35rem;
      margin-top: 0.1rem;
    }

    .web-link.bm-search-result-url {
      overflow-wrap: anywhere;
      word-break: break-all;
      font-size: 0.8125rem;
    }

    .web-stack.bm-search-result-details {
      gap: 0.25rem;
      padding: 0.45rem 0.65rem;
      border-left: 2px solid color-mix(in srgb, var(--color-accent) 70%, transparent);
      background: color-mix(in srgb, var(--color-surface-alt) 94%, var(--color-accent) 6%);
    }

    .web-row.bm-search-detail-row {
      align-items: baseline;
      gap: 0.45rem;
    }

    .web-text.bm-search-detail-label {
      min-width: 5.5rem;
      font-weight: 700;
    }

    .web-badge.bm-media-badge {
      color: var(--color-warning);
    }

    .web-form.bm-search-form.web-form--stacked {
      gap: 0.35rem;
      padding: 0.65rem;
      border: 1px solid color-mix(in srgb, var(--color-border) 75%, transparent);
      background: color-mix(in srgb, var(--color-surface-alt) 94%, var(--color-accent) 6%);
    }

    .web-form.bm-ai-prompt-form.web-form--stacked {
      gap: 0.35rem;
      margin-top: 0.25rem;
      padding: 0.65rem;
      border: 1px solid color-mix(in srgb, var(--color-border) 75%, transparent);
      background: color-mix(in srgb, var(--color-surface-alt) 94%, var(--color-warning) 6%);
    }

    .web-form.bm-media-type-filter-form.web-form--stacked {
      gap: 0.35rem;
      padding: 0.65rem;
      border: 1px solid color-mix(in srgb, var(--color-border) 75%, transparent);
      background: color-mix(in srgb, var(--color-surface-alt) 94%, var(--color-info) 6%);
    }

    .web-stack.bm-media-type-filter-options {
      gap: 0.2rem;
    }

    .web-text.bm-panel-label {
      font-size: 0.78rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-text-muted);
    }

    .web-text.bm-field-label {
      font-size: 0.74rem;
      font-weight: 700;
      color: var(--color-text-muted);
    }

    .web-tabs.bm-search-mode-tabs {
      display: grid;
      gap: 0.45rem;
    }

    .web-tabPanel.bm-search-mode-panel {
      display: grid;
      gap: 0.45rem;
    }

    .web-stack.bm-search-relay-support {
      gap: 0.15rem;
      padding: 0.45rem 0.55rem;
      border-left: 2px solid color-mix(in srgb, var(--color-info) 70%, transparent);
      background: color-mix(in srgb, var(--color-surface-alt) 94%, var(--color-info) 6%);
    }

    .web-stack.bm-search-empty {
      gap: 0.25rem;
      padding: 0.55rem 0.65rem;
      border-left: 2px solid color-mix(in srgb, var(--color-accent) 70%, transparent);
      background: color-mix(in srgb, var(--color-surface-alt) 94%, var(--color-accent) 6%);
    }

    .web-stack.bm-list-empty {
      gap: 0.25rem;
      padding: 0.55rem 0.65rem;
      border-left: 2px solid color-mix(in srgb, var(--color-warning) 70%, transparent);
      background: color-mix(in srgb, var(--color-surface-alt) 94%, var(--color-warning) 6%);
    }

  `,
} as const;

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

/** Active media-type narrowing from the current invocation; null = show all. */
function mediaTypeFilterSelection(
  representation: BmListRepresentation,
): string[] | null {
  const options = representation.data.listInvocation.options;
  const types = options.media_types;

  if (Array.isArray(types) && types.length > 0) {
    const normalized = types
      .map((t) => String(t).trim().toLowerCase())
      .filter((t) => t.length > 0);

    return normalized.length > 0 ? normalized : null;
  }

  const legacy = options.type;

  if (typeof legacy === 'string' && legacy.trim() !== '') {
    return [legacy.trim().toLowerCase()];
  }

  return null;
}

/** Checklist options: canonical types first, then any stray labels in the data. */
function availableMediaTypes(items: BmListItem[]): string[] {
  const pool: string[] = [...KNOWN_MEDIA_TYPES];

  for (const item of items) {
    const t = item.media_type.trim().toLowerCase();

    if (t.length > 0 && !pool.includes(t)) {
      pool.push(t);
    }
  }

  return pool;
}

function buildMediaTypeFilterPanel(
  representation: BmListRepresentation,
): WebNode {
  const refresh = listRefresh(representation);
  const selected = mediaTypeFilterSelection(representation);
  const types = availableMediaTypes(representation.data.items);

  // Strip the current include-set: the form submit replaces it with the
  // freshly checked values instead of accumulating into the old set.
  const baseOptions: Record<string, unknown> = { ...refresh.options };
  delete baseOptions.media_types;

  return {
    type: 'element',
    tag: 'form',
    props: {
      className: 'web-form web-form--stacked bm-media-type-filter-form',
      revealId: BM_LIST_MEDIA_TYPE_FILTER_REVEAL_ID,
      hiddenUntilRevealed: true,
      formOptionFieldNames: ['media_types'],
      action: {
        type: 'command',
        command: representation.meta.command,
        subcommand: 'list',
        arguments: refresh.arguments,
        options: baseOptions,
      },
    },
    children: [
      {
        type: 'element',
        tag: 'text',
        props: { className: 'bm-panel-label' },
        children: [{ type: 'text', value: 'MEDIA TYPES' }],
      },
      {
        type: 'element',
        tag: 'stack',
        props: { className: 'bm-media-type-filter-options' },
        children: types.map((mediaType) => ({
          type: 'element',
          tag: 'row',
          props: { gap: 'xs', itemAlign: 'center' },
          children: [
            {
              type: 'element',
              tag: 'checkbox',
              props: {
                formFieldName: 'media_types',
                value: mediaType,
                checked: selected === null || selected.includes(mediaType),
                className: 'web-checkbox--retro',
              },
              children: [],
            },
            {
              type: 'element',
              tag: 'text',
              props: { size: 'sm', className: 'bm-media-type-filter-label' },
              children: [{ type: 'text', value: mediaTypeLabel(mediaType) }],
            },
          ],
        })),
      },
      {
        type: 'element',
        tag: 'row',
        props: { className: 'web-form__actions', gap: 'sm' },
        children: [
          {
            type: 'element',
            tag: 'button',
            props: { label: 'Apply', htmlType: 'submit' },
            children: [],
          },
          {
            type: 'element',
            tag: 'button',
            props: {
              label: 'Close',
              action: {
                type: 'hideReveal',
                targetId: BM_LIST_MEDIA_TYPE_FILTER_REVEAL_ID,
              },
            },
            children: [],
          },
        ],
      },
    ],
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

function deleteBookmarkAction(
  representation: BmListRepresentation,
  id: number,
): WebAction {
  return {
    type: 'command',
    command: representation.meta.command,
    subcommand: 'delete',
    arguments: { id },
    options: {},
    refresh: listRefresh(representation),
  };
}

function copyBookmarkIdAction(id: number): WebAction {
  return {
    type: 'clientAction',
    action: 'clipboard.writeText',
    payload: { text: `#${id}` },
  };
}

function publishBookmarkAction(
  representation: BmListRepresentation,
  item: BmListItem,
): WebAction {
  const publishedAtSeconds = Math.floor(Date.now() / 1000);

  const topicTags = item.tags
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const allTags = [...new Set([...topicTags, item.media_type.trim()])];

  return {
    type: 'clientAction',
    action: 'nostr.publishKind1',
    payload: {
      kind: BM_BOOKMARK_KIND,
      content: item.description ?? item.summary ?? '',
      tags: [
        ['d', getBookmarkIdentifier(item.url)],
        ['published_at', String(publishedAtSeconds)],
        ['title', item.title],
        ['m', item.media_type],
        ['category', item.category],
        ...allTags.map((tag) => ['t', tag]),
      ],
      signTitle: 'Sign Event: Publish bookmark',
      fallbackRelays: PUBLISH_FALLBACK_RELAYS,
      statusTitle: 'Bookmark published',
      statusMessage: `Bookmark #${item.id}`,
      onSuccessCommand: {
        command: representation.meta.command,
        subcommand: 'publish',
        arguments: { id: item.id },
        options: {},
      },
    },
    refresh: listRefresh(representation),
  };
}

function buildListAiCommandForm(representation: BmListRepresentation): WebNode {
  const refresh = listRefresh(representation);

  return {
    type: 'element',
    tag: 'form',
    props: {
      className:
        'web-form web-form--stacked web-form--ai-prompt bm-ai-prompt-form',
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
        tag: 'text',
        props: { className: 'bm-panel-label' },
        children: [{ type: 'text', value: 'Edit with AI' }],
      },
      {
        type: 'element',
        tag: 'textArea',
        props: {
          formFieldName: 'prompt',
          inputPlaceholder:
            'Add, find, or edit bookmarks using a prompt or URL',
          maxRows: 4,
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
  const favicon = bookmarkFaviconNode(item.url);

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
    {
      type: 'element',
      tag: 'menuItem',
      props: {
        label: 'Publish',
        action: publishBookmarkAction(representation, item),
      },
    },
    {
      type: 'element',
      tag: 'menuItem',
      props: {
        label: `Copy #${item.id}`,
        action: copyBookmarkIdAction(item.id),
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

  actions.push({
    type: 'element',
    tag: 'menuItem',
    props: {
      label: 'Delete',
      tone: 'danger',
      action: deleteBookmarkAction(representation, item.id),
    },
  });

  return {
    type: 'element',
    tag: 'row',
    props: {
      gap: 'sm',
      className: 'bm-list-item-row',
      itemAlign: 'start',
      storyTargetId: `bm-list-item-${item.id}`,
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
              ...(favicon ? [favicon] : []),
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
            children: [
              ...badges,
              ...(item.nostr_naddr
                ? [
                    {
                      type: 'element' as const,
                      tag: 'link' as const,
                      props: {
                        href: item.nostr_naddr,
                        external: true,
                        tone: 'muted' as const,
                        size: 'sm' as const,
                      },
                      children: [{ type: 'text' as const, value: 'published' }],
                    },
                  ]
                : []),
            ],
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
      storyTargetId: `bm-list-category-${node.path}`,
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
          ...childCategories.map((child) =>
            renderCategoryTreeItem(representation, child),
          ),
          ...node.items.map((item) =>
            renderBookmarkTreeItem({
              representation,
              item,
              showCategory: false,
            }),
          ),
        ],
      },
    ],
  };
}

function buildLocalEmptyTree(toolbarActions: BmToolbarAction[]): WebNode {
  return {
    type: 'element',
    tag: 'tree',
    props: {
      gap: 'xs',
      className: 'bm-list-tree',
      filterable: true,
      filterPlaceholder: 'Filter bookmarks',
      toolbarActions: toolbarActions.length > 0 ? toolbarActions : undefined,
    },
    children: [
      {
        type: 'element',
        tag: 'treeItem',
        props: {
          id: 'bm-list-empty',
          defaultExpanded: true,
          filterText: 'No bookmarks yet',
          filterName: 'No bookmarks',
        },
        summary: {
          type: 'element',
          tag: 'text',
          props: { tone: 'muted', weight: 'semibold' },
          children: [{ type: 'text', value: 'No bookmarks.' }],
        },
        children: [
          {
            type: 'element',
            tag: 'stack',
            props: { className: 'bm-list-empty' },
            children: [
              {
                type: 'element',
                tag: 'text',
                props: { tone: 'muted', size: 'sm' },
                children: [
                  {
                    type: 'text',
                    value:
                      'Use the AI form below to save your first bookmark, or switch to Search to discover published bookmarks.',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

export function renderListWeb(
  representation: BmListRepresentation,
  options: RenderListWebOptions = {
    activeTabId: 'bm-local',
    searchSession: null,
    nip50RelaySupport: null,
  },
): WebNodeRoot {
  const effectiveGroupBy = representation.data.groupBy ?? 'cats';

  const mediaTypeToolbarActions: BmToolbarAction[] = [
    {
      label:
        mediaTypeFilterSelection(representation) === null
          ? 'Media types'
          : 'Media types: filtered',
      icon: 'checklist',
      action: {
        type: 'toggleReveal',
        targetId: BM_LIST_MEDIA_TYPE_FILTER_REVEAL_ID,
      },
    },
  ];

  const localTree: WebNode =
    representation.data.items.length === 0
      ? buildLocalEmptyTree(mediaTypeToolbarActions)
      : effectiveGroupBy === 'cats'
        ? {
            type: 'element',
            tag: 'tree',
            props: {
              gap: 'xs',
              className: 'bm-list-tree',
              filterable: true,
              filterPlaceholder: 'Filter bookmarks',
              toolbarActions: mediaTypeToolbarActions,
            },
            children: buildCategoryTree(representation.data.items).map((node) =>
              renderCategoryTreeItem(representation, node),
            ),
          }
        : {
            type: 'element',
            tag: 'tree',
            props: {
              gap: 'xs',
              className: 'bm-list-tree',
              filterable: true,
              filterPlaceholder: 'Filter bookmarks',
              toolbarActions: mediaTypeToolbarActions,
            },
            children: representation.data.items.map((item) =>
              renderBookmarkTreeItem({
                representation,
                item,
                showCategory: true,
              }),
            ),
          };

  return {
    kind: 'ui',
    version: 1,
    meta: representation.meta,
    widgetHelp: {
      title: 'Bookmark manager',
      body: [
        'Keep your bookmarks tidy with the help of AI. Access them from anywhere, search public bookmarks ordered by your network, and publish yours when you want.',
      ],
      stories: [
        {
          id: 'bm-save-ai',
          title: 'Save a bookmark with AI',
          description:
            'Use the Bookmarks widget AI prompt to save, summarize, categorize, and queue a resource.',
          pluginAlias: representation.meta.command,
          iconUrl: '/plugin-icons/bm/commands__list__renderers__list.svg',
        },
      ],
    },
    tree: {
      type: 'element',
      tag: 'stack',
      props: { gap: 'md', className: 'bm-list-layout' },
      children: [
        {
          type: 'element',
          tag: 'tabs',
          props: {
            className: 'bm-list-tabs',
            defaultActiveTabId: options.activeTabId,
          },
          children: [
            {
              type: 'element',
              tag: 'tabPanel',
              props: {
                id: 'bm-local',
                label: 'Local',
                className: 'bm-list-tab-panel',
              },
              children: [
                buildMediaTypeFilterPanel(representation),
                localTree,
                buildListAiCommandForm(representation),
              ],
            },
            {
              type: 'element',
              tag: 'tabPanel',
              props: {
                id: 'bm-search',
                label: 'Search',
                className: 'bm-list-tab-panel',
              },
              children: [
                buildPublishedSearchTabs({
                  command: representation.meta.command,
                  session: options.searchSession,
                  nip50RelaySupport: options.nip50RelaySupport,
                }),
                options.searchSession
                  ? buildPublishedSearchResultsTree({
                      command: representation.meta.command,
                      session: options.searchSession,
                    })
                  : buildPublishedSearchPlaceholderTree(),
              ],
            },
          ],
        },
      ],
    },
    stylesheets: [bmListStylesheet],
  };
}
