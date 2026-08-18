import type { WebNode } from '@src/web/ui-schema';

import { bookmarkFaviconNode } from '../../../format';

import type { BmNip50RelaySupport } from '../nip50';
import type { BmStoredSearchSession } from '../search-session';

type PublishedSearchWebProps = {
  command: string;
  session: BmStoredSearchSession | null;
  nip50RelaySupport: BmNip50RelaySupport | null;
};

type PublishedSearchResultsTreeProps = {
  command: string;
  session: BmStoredSearchSession;
};

type SearchResultTreeItemProps = {
  command: string;
  item: BmStoredSearchSession['results'][number];
  displayIndex: number;
};

const SEARCH_LIMIT_CHOICES = ['50', '100', '200', '500'];

function buildSearchLimitSelect(storyTargetId: string, value: number): WebNode {
  return {
    type: 'element',
    tag: 'select',
    props: {
      formFieldName: 'limit',
      choices: SEARCH_LIMIT_CHOICES,
      value: String(value),
      storyTargetId,
    },
  };
}

function searchLimitValue(session: BmStoredSearchSession | null): number {
  return session?.filters.limit ?? 200;
}

function buildHashtagSearchForm({
  command,
  session,
  nip50RelaySupport: _nip50RelaySupport,
}: PublishedSearchWebProps): WebNode {
  return {
    type: 'element',
    tag: 'form',
    props: {
      className: 'web-form web-form--stacked bm-search-form',
      formOptionFieldNames: ['limit'],
      action: {
        type: 'command',
        command,
        subcommand: 'search',
        arguments: { args: ['--tags'] },
        options: {},
        recordInTimeline: false,
      },
    },
    children: [
      {
        type: 'element',
        tag: 'text',
        props: { className: 'bm-panel-label' },
        children: [{ type: 'text', value: 'Hashtag search' }],
      },
      {
        type: 'element',
        tag: 'textField',
        props: {
          formFieldName: 'args',
          inputPlaceholder: 'nostr, design, ai',
          value: session?.filters.tags_any.join(', ') ?? '',
          storyTargetId: 'bm-published-hashtag-search-text',
        },
      },
      {
        type: 'element',
        tag: 'text',
        props: { tone: 'muted', size: 'sm' },
        children: [
          {
            type: 'text',
            value:
              'Searches published bookmark #t tags. Use comma-separated tags.',
          },
        ],
      },
      {
        type: 'element',
        tag: 'text',
        props: { className: 'bm-field-label' },
        children: [{ type: 'text', value: 'Limit' }],
      },
      buildSearchLimitSelect(
        'bm-published-hashtag-search-limit',
        searchLimitValue(session),
      ),
      {
        type: 'element',
        tag: 'row',
        props: { className: 'web-form__actions' },
        children: [
          {
            type: 'element',
            tag: 'button',
            props: {
              label: 'Search',
              htmlType: 'submit',
              storyTargetId: 'bm-published-hashtag-search-submit',
            },
          },
        ],
      },
    ],
  };
}

function buildFullTextSearchForm({
  command,
  session,
  nip50RelaySupport,
}: PublishedSearchWebProps): WebNode {
  const supportedRelays = nip50RelaySupport?.supportedRelays ?? [];

  return {
    type: 'element',
    tag: 'form',
    props: {
      className: 'web-form web-form--stacked bm-search-form',
      formOptionFieldNames: ['limit'],
      action: {
        type: 'command',
        command,
        subcommand: 'search',
        arguments: { args: ['--search'] },
        options: {},
        recordInTimeline: false,
        clientContext: ['nostrSearchRelays'],
      },
    },
    children: [
      {
        type: 'element',
        tag: 'text',
        props: { className: 'bm-panel-label' },
        children: [{ type: 'text', value: 'Full text search' }],
      },
      {
        type: 'element',
        tag: 'textField',
        props: {
          formFieldName: 'args',
          inputPlaceholder: 'nostr design UX',
          value: session?.filters.title ?? '',
          storyTargetId: 'bm-published-full-text-search-text',
        },
      },
      {
        type: 'element',
        tag: 'text',
        props: { tone: 'muted', size: 'sm' },
        children: [
          {
            type: 'text',
            value:
              'Full-text relay support will be checked from your NIP-65 read relays.',
          },
        ],
      },
      {
        type: 'element',
        tag: 'stack',
        props: { className: 'bm-search-relay-support' },
        children: [
          {
            type: 'element',
            tag: 'text',
            props: { className: 'bm-field-label' },
            children: [{ type: 'text', value: 'Supported relays' }],
          },
          ...(nip50RelaySupport === null
            ? [
                {
                  type: 'element' as const,
                  tag: 'text' as const,
                  props: { tone: 'muted' as const, size: 'sm' as const },
                  children: [
                    {
                      type: 'text' as const,
                      value: 'NIP-50 support status is not loaded yet.',
                    },
                  ],
                },
              ]
            : [
                {
                  type: 'element' as const,
                  tag: 'text' as const,
                  props: { tone: 'muted' as const, size: 'sm' as const },
                  children: [
                    {
                      type: 'text' as const,
                      value: `Supported relays (${supportedRelays.length}):`,
                    },
                  ],
                },
                ...(supportedRelays.length > 0
                  ? supportedRelays.map((relay): WebNode => ({
                      type: 'element',
                      tag: 'text',
                      props: { size: 'sm', className: 'bm-search-relay-url' },
                      children: [{ type: 'text', value: relay }],
                    }))
                  : [
                      {
                        type: 'element' as const,
                        tag: 'text' as const,
                        props: { tone: 'muted' as const, size: 'sm' as const },
                        children: [
                          {
                            type: 'text' as const,
                            value:
                              'No NIP-50 capable relays were found in your NIP-65 read relays.',
                          },
                        ],
                      },
                    ]),
              ]),
        ],
      },
      {
        type: 'element',
        tag: 'text',
        props: { className: 'bm-field-label' },
        children: [{ type: 'text', value: 'Limit' }],
      },
      buildSearchLimitSelect(
        'bm-published-full-text-search-limit',
        searchLimitValue(session),
      ),
      {
        type: 'element',
        tag: 'row',
        props: { className: 'web-form__actions' },
        children: [
          {
            type: 'element',
            tag: 'button',
            props: {
              label: 'Search',
              htmlType: 'submit',
              storyTargetId: 'bm-published-full-text-search-submit',
            },
          },
        ],
      },
    ],
  };
}

export function buildPublishedSearchTabs({
  command,
  session,
  nip50RelaySupport,
}: PublishedSearchWebProps): WebNode {
  const defaultActiveTabId =
    session?.filters.title && session.filters.tags_any.length === 0
      ? 'bm-search-full-text'
      : 'bm-search-hashtag';

  return {
    type: 'element',
    tag: 'tabs',
    props: {
      className: 'bm-search-mode-tabs',
      defaultActiveTabId,
    },
    children: [
      {
        type: 'element',
        tag: 'tabPanel',
        props: {
          id: 'bm-search-hashtag',
          label: 'Hashtag search',
          className: 'bm-search-mode-panel',
        },
        children: [
          buildHashtagSearchForm({ command, session, nip50RelaySupport }),
        ],
      },
      {
        type: 'element',
        tag: 'tabPanel',
        props: {
          id: 'bm-search-full-text',
          label: 'Full text search',
          className: 'bm-search-mode-panel',
        },
        children: [
          buildFullTextSearchForm({ command, session, nip50RelaySupport }),
        ],
      },
    ],
  };
}

export function buildPublishedSearchPlaceholderTree(): WebNode {
  return {
    type: 'element',
    tag: 'tree',
    props: {
      gap: 'xs',
      className: 'bm-search-tree',
      filterable: true,
      filterPlaceholder: 'Filter search results',
    },
    children: [
      {
        type: 'element',
        tag: 'treeItem',
        props: {
          id: 'bm-search-empty',
          defaultExpanded: true,
          filterText: 'Search published bookmarks from your WoT network',
          filterName: 'Search bookmarks',
        },
        summary: {
          type: 'element',
          tag: 'text',
          props: { tone: 'muted', weight: 'semibold' },
          children: [{ type: 'text', value: 'Search results' }],
        },
        children: [
          {
            type: 'element',
            tag: 'stack',
            props: { className: 'bm-search-empty' },
            children: [
              {
                type: 'element',
                tag: 'text',
                props: { tone: 'muted', size: 'sm' },
                children: [
                  {
                    type: 'text',
                    value:
                      'Run a search above to show published bookmark results here.',
                  },
                ],
              },
              {
                type: 'element',
                tag: 'text',
                props: { tone: 'muted', size: 'sm' },
                children: [
                  {
                    type: 'text',
                    value:
                      'Search results are ranked by WoT score when available.',
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

function searchResultFilterText(
  item: BmStoredSearchSession['results'][number],
  displayIndex: number,
): string {
  return [
    `#${displayIndex}`,
    item.title,
    item.url,
    item.pubkey,
    item.category,
    item.media_type,
    item.tags.join(' '),
    item.content,
  ]
    .filter(
      (value): value is string => typeof value === 'string' && value.length > 0,
    )
    .join('\n');
}

function searchResultMetaBadges(
  item: BmStoredSearchSession['results'][number],
): WebNode[] {
  const badges: WebNode[] = [];

  if (item.media_type) {
    badges.push({
      type: 'element',
      tag: 'badge',
      props: { label: item.media_type, tone: 'muted', size: 'sm' },
    });
  }

  if (item.category) {
    badges.push({
      type: 'element',
      tag: 'badge',
      props: { label: item.category, tone: 'info', size: 'sm' },
    });
  }

  for (const tag of item.tags.slice(0, 4)) {
    badges.push({
      type: 'element',
      tag: 'badge',
      props: { label: `#${tag}`, tone: 'muted', size: 'sm' },
    });
  }

  if (item.tags.length > 4) {
    badges.push({
      type: 'element',
      tag: 'badge',
      props: {
        label: `+${item.tags.length - 4} tags`,
        tone: 'muted',
        size: 'sm',
      },
    });
  }

  return badges;
}

function searchPageAction(
  command: string,
  pageCommand: 'prev' | 'next',
): WebNode {
  return {
    type: 'element',
    tag: 'button',
    props: {
      label: pageCommand === 'prev' ? 'Prev' : 'Next',
      action: {
        type: 'command',
        command,
        subcommand: 'search',
        arguments: { args: [pageCommand] },
        options: {},
        recordInTimeline: false,
      },
    },
  };
}

function askAiAboutSearchResultAction(
  item: BmStoredSearchSession['results'][number],
): WebNode | null {
  if (!item.url) {
    return null;
  }

  return {
    type: 'element',
    tag: 'menuItem',
    props: {
      label: 'Ask AI',
      action: {
        type: 'agentPrompt',
        prompt: `Visit the given URL and explain its purpose to the user concisely: ${item.url}`,
        recordInTimeline: true,
      },
    },
  };
}

function searchResultDetails(
  item: BmStoredSearchSession['results'][number],
): WebNode[] {
  const rows: WebNode[] = [
    detailRow('Pubkey', item.pubkey),
    detailRow('Event', item.id),
  ];

  if (item.content.trim().length > 0) {
    rows.push(detailRow('Description', item.content));
  }

  if (item.category) {
    rows.push(detailRow('Category', item.category));
  }

  if (item.media_type) {
    rows.push(detailRow('Media', item.media_type));
  }

  if (item.tags.length > 0) {
    rows.push(detailRow('Tags', item.tags.map((tag) => `#${tag}`).join(' ')));
  }

  return rows;
}

function detailRow(label: string, value: string): WebNode {
  return {
    type: 'element',
    tag: 'row',
    props: { className: 'bm-search-detail-row', gap: 'sm' },
    children: [
      {
        type: 'element',
        tag: 'text',
        props: {
          className: 'bm-search-detail-label',
          tone: 'muted',
          size: 'sm',
        },
        children: [{ type: 'text', value: label }],
      },
      {
        type: 'element',
        tag: 'text',
        props: { size: 'sm', whiteSpace: 'pre-wrap' },
        children: [{ type: 'text', value }],
      },
    ],
  };
}

function renderSearchResultTreeItem({
  command,
  item,
  displayIndex,
}: SearchResultTreeItemProps): WebNode {
  const score = item.wotScore === null ? 'n/a' : item.wotScore.toFixed(2);
  const title = item.title ?? '(untitled bookmark)';
  const askAiAction = askAiAboutSearchResultAction(item);
  const favicon = bookmarkFaviconNode(item.url);

  const titleNode: WebNode = item.url
    ? {
        type: 'element',
        tag: 'link',
        props: { href: item.url, external: true, weight: 'semibold' },
        children: [{ type: 'text', value: title }],
      }
    : {
        type: 'element',
        tag: 'text',
        props: { weight: 'semibold' },
        children: [{ type: 'text', value: title }],
      };

  return {
    type: 'element',
    tag: 'treeItem',
    props: {
      id: `bm-search-result-${displayIndex}`,
      filterText: searchResultFilterText(item, displayIndex),
      filterName: title,
      defaultExpanded: false,
    },
    summary: {
      type: 'element',
      tag: 'row',
      props: {
        className: 'bm-search-result-row',
        gap: 'sm',
        itemAlign: 'start',
      },
      children: [
        {
          type: 'element',
          tag: 'stack',
          props: { className: 'bm-search-result-main', gap: 'xs' },
          children: [
            {
              type: 'element',
              tag: 'row',
              props: {
                gap: 'xs',
                itemAlign: 'baseline',
                className: 'bm-search-result-title-row',
              },
              children: [
                ...(favicon ? [favicon] : []),
                titleNode,
                {
                  type: 'element',
                  tag: 'text',
                  props: { tone: 'muted', size: 'sm' },
                  children: [{ type: 'text', value: `#${displayIndex}` }],
                },
              ],
            },
            ...(item.url
              ? [
                  {
                    type: 'element' as const,
                    tag: 'link' as const,
                    props: {
                      href: item.url,
                      external: true,
                      tone: 'muted' as const,
                      size: 'sm' as const,
                      className: 'bm-search-result-url',
                    },
                    children: [{ type: 'text' as const, value: item.url }],
                  },
                ]
              : []),
            {
              type: 'element',
              tag: 'row',
              props: { className: 'bm-search-result-meta', gap: 'xs' },
              children: [
                {
                  type: 'element',
                  tag: 'badge',
                  props: { label: `WoT ${score}`, tone: 'info', size: 'sm' },
                },
                ...searchResultMetaBadges(item),
              ],
            },
          ],
        },
        {
          type: 'element',
          tag: 'overflowMenu',
          props: { label: '⋮', buttonVariant: 'icon' },
          children: [
            ...(askAiAction ? [askAiAction] : []),
            {
              type: 'element',
              tag: 'menuItem',
              props: {
                label: 'Import',
                action: {
                  type: 'command',
                  command,
                  subcommand: 'search',
                  arguments: { args: ['import', String(displayIndex)] },
                  options: {},
                  recordInTimeline: false,
                },
              },
            },
          ],
        },
      ],
    },
    children: [
      {
        type: 'element',
        tag: 'stack',
        props: { className: 'bm-search-result-details', gap: 'xs' },
        children: searchResultDetails(item),
      },
    ],
  };
}

export function buildPublishedSearchResultsTree({
  command,
  session,
}: PublishedSearchResultsTreeProps): WebNode {
  const isFullTextSearch =
    session.filters.title !== null && session.filters.tags_any.length === 0;

  const totalPages = Math.max(
    1,
    Math.ceil(session.results.length / session.pageSize),
  );

  const page = Math.min(Math.max(session.page, 1), totalPages);
  const startIndex = (page - 1) * session.pageSize;

  const pageItems = session.results.slice(
    startIndex,
    startIndex + session.pageSize,
  );

  return {
    type: 'element',
    tag: 'tree',
    props: {
      gap: 'xs',
      className: 'bm-search-tree',
      filterable: true,
      filterPlaceholder: 'Filter search results',
    },
    children: [
      {
        type: 'element',
        tag: 'treeItem',
        props: {
          id: `bm-search-session-${session.sessionId}-page-${page}`,
          defaultExpanded: true,
          filterText: 'Published bookmark search results',
          filterName: 'Search results',
        },
        summary: {
          type: 'element',
          tag: 'row',
          props: { gap: 'sm', itemAlign: 'center' },
          children: [
            {
              type: 'element',
              tag: 'text',
              props: { weight: 'semibold' },
              children: [
                {
                  type: 'text',
                  value: `${session.results.length} published bookmark${session.results.length === 1 ? '' : 's'}`,
                },
              ],
            },
            {
              type: 'element',
              tag: 'badge',
              props: {
                label: `Page ${page} of ${totalPages}`,
                tone: 'info',
                size: 'sm',
              },
            },
            ...(totalPages > 1
              ? [
                  searchPageAction(command, 'prev'),
                  searchPageAction(command, 'next'),
                ]
              : []),
          ],
        },
        children: [
          {
            type: 'element',
            tag: 'stack',
            props: { className: 'bm-search-results', gap: 'xs' },
            children:
              pageItems.length > 0
                ? pageItems.map((item, index) =>
                    renderSearchResultTreeItem({
                      command,
                      item,
                      displayIndex: startIndex + index + 1,
                    }),
                  )
                : [
                    {
                      type: 'element',
                      tag: 'text',
                      props: { tone: 'muted', size: 'sm' },
                      children: [
                        {
                          type: 'text',
                          value: isFullTextSearch
                            ? 'No full-text search results found. Check your Account → Nostr → Search relays setting, then try another query.'
                            : 'No search results found.',
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
