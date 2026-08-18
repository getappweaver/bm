import type { WebNode, WebNodeRoot } from '@src/web/ui-schema';

import { bookmarkFaviconNode, mediaTypeLabel } from '../../../format';

import type { BmDetailRepresentation } from '../representation/schema';

const bmDetailStylesheet = {
  id: 'bm-detail-web',
  cssText: `
    .web-stack.bm-detail-layout {
      gap: 0.75rem;
      padding: 0.5rem;
    }

    .web-row.bm-detail-title-row {
      align-items: baseline;
      gap: 0.5rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--color-border, currentColor);
      flex-wrap: nowrap;
    }

    .web-row.bm-detail-title-row .web-link {
      min-width: 0;
    }

    .web-link.bm-detail-title {
      font-size: 1.125rem;
      font-weight: 600;
    }

    .web-image.bm-favicon {
      width: 1rem;
      height: 1rem;
      flex-shrink: 0;
      align-self: flex-start;
      object-fit: contain;
      margin-top: 0.1rem;
    }

    .web-text.bm-detail-id {
      font-size: 0.875rem;
    }

    .web-stack.bm-detail-meta {
      gap: 0.5rem;
    }

    .web-row.bm-detail-meta-row {
      align-items: baseline;
      gap: 0.5rem;
    }

    .web-text.bm-detail-label {
      min-width: 6rem;
      font-weight: 500;
      font-size: 0.875rem;
    }

    .web-link.bm-detail-url {
      word-break: break-all;
      overflow-wrap: anywhere;
    }

    .web-text.bm-detail-value {
      font-size: 0.875rem;
    }

    .web-text.bm-detail-description {
      padding: 0.5rem;
      background: var(--color-surface-alt);
      border-radius: 0.375rem;
      font-size: 0.875rem;
      line-height: 1.5;
      white-space: pre-wrap;
    }

    .web-row.bm-detail-badges {
      gap: 0.35rem;
      flex-wrap: wrap;
    }

    .web-badge.bm-media-badge {
      color: var(--color-warning);
    }
  `,
} as const;

function formatDate(timestamp: number | null): string {
  if (timestamp === null) {
    return '—';
  }

  return new Date(timestamp).toLocaleString();
}

function metaRow(label: string, value: WebNode): WebNode {
  return {
    type: 'element',
    tag: 'row',
    props: {
      className: 'bm-detail-meta-row',
      itemAlign: 'baseline' as const,
    },
    children: [
      {
        type: 'element',
        tag: 'text',
        props: {
          tone: 'muted' as const,
          size: 'sm' as const,
          className: 'bm-detail-label',
        },
        children: [{ type: 'text' as const, value: `${label}:` }],
      },
      value,
    ],
  };
}

function textValue(text: string): WebNode {
  return {
    type: 'element',
    tag: 'text',
    props: {
      size: 'sm' as const,
      className: 'bm-detail-value',
    },
    children: [{ type: 'text' as const, value: text }],
  };
}

type TagCountRow = {
  tag: string;
  count: number;
};

type RenderDetailWebOptions = {
  tagCounts: TagCountRow[];
};

function renderTagsValueNode(
  representation: BmDetailRepresentation,
  options: RenderDetailWebOptions | undefined,
): WebNode {
  if (options === undefined || options.tagCounts.length === 0) {
    return textValue(representation.data.bookmark.tags);
  }

  const children: WebNode[] = [];

  for (const [index, row] of options.tagCounts.entries()) {
    if (index > 0) {
      children.push({
        type: 'text',
        value: ', ',
      });
    }

    if (row.count > 1) {
      children.push({
        type: 'element',
        tag: 'button',
        props: {
          label: `${row.tag} (${row.count})`,
          className: 'web-button--link',
          action: {
            type: 'command',
            command: representation.meta.command,
            subcommand: 'list',
            arguments: {},
            options: {
              tag: row.tag,
            },
          },
        },
      });
    } else {
      children.push({
        type: 'text',
        value: `${row.tag} (${row.count})`,
      });
    }
  }

  return {
    type: 'element',
    tag: 'row',
    props: {
      gap: 'xs',
      itemAlign: 'baseline',
    },
    children: [
      {
        type: 'element',
        tag: 'text',
        props: {
          size: 'sm',
          className: 'bm-detail-value',
        },
        children,
      },
    ],
  };
}

export function renderDetailWeb(
  representation: BmDetailRepresentation,
  options?: RenderDetailWebOptions,
): WebNodeRoot {
  const bm = representation.data.bookmark;

  const favicon = bookmarkFaviconNode(bm.url);

  const metaChildren: WebNode[] = [
    // URL
    metaRow('URL', {
      type: 'element',
      tag: 'link',
      props: {
        href: bm.url,
        external: true,
        tone: 'info' as const,
        size: 'sm' as const,
        className: 'bm-detail-url',
      },
      children: [{ type: 'text' as const, value: bm.url }],
    }),

    // Category
    metaRow('Category', textValue(bm.category)),

    // Media type
    metaRow('Media type', {
      type: 'element',
      tag: 'badge',
      props: {
        label: mediaTypeLabel(bm.media_type),
        className: 'bm-media-badge',
        size: 'sm' as const,
      },
    }),

    // Tags
    metaRow('Tags', renderTagsValueNode(representation, options)),

    // Status badges
    {
      type: 'element',
      tag: 'row',
      props: {
        className: 'bm-detail-badges',
        itemAlign: 'center' as const,
      },
      children: [
        ...(bm.in_queue
          ? [
              {
                type: 'element' as const,
                tag: 'badge' as const,
                props: {
                  label: 'Queued',
                  tone: 'info' as const,
                  size: 'sm' as const,
                },
              },
            ]
          : []),
        ...(bm.consumed_at !== null
          ? [
              {
                type: 'element' as const,
                tag: 'badge' as const,
                props: {
                  label: 'Consumed',
                  tone: 'success' as const,
                  size: 'sm' as const,
                },
              },
            ]
          : []),
      ],
    },

    // Summary (if available)
    ...(bm.summary
      ? [
          metaRow('Summary', {
            type: 'element',
            tag: 'text',
            props: {
              size: 'sm' as const,
              className: 'bm-detail-description',
              whiteSpace: 'pre-wrap' as const,
            },
            children: [{ type: 'text' as const, value: bm.summary }],
          }),
        ]
      : []),

    // Description (if available)
    ...(bm.description
      ? [
          metaRow('Description', {
            type: 'element',
            tag: 'text',
            props: {
              size: 'sm' as const,
              className: 'bm-detail-description',
              whiteSpace: 'pre-wrap' as const,
            },
            children: [{ type: 'text' as const, value: bm.description }],
          }),
        ]
      : []),

    // Created date
    metaRow('Created', textValue(formatDate(bm.created_at))),

    // Consumed date
    ...(bm.consumed_at !== null
      ? [metaRow('Consumed', textValue(formatDate(bm.consumed_at)))]
      : []),

    // Published date
    ...(bm.published_at !== null
      ? [metaRow('Published', textValue(formatDate(bm.published_at)))]
      : []),

    // Nostr address (if available)
    ...(bm.nostr_naddr
      ? [
          metaRow('Nostr addr', {
            type: 'element',
            tag: 'text',
            props: {
              size: 'sm' as const,
              className: 'bm-detail-value',
              whiteSpace: 'pre-wrap' as const,
            },
            children: [{ type: 'text' as const, value: bm.nostr_naddr }],
          }),
        ]
      : []),
  ];

  return {
    kind: 'ui',
    version: 1,
    meta: representation.meta,
    stylesheets: [bmDetailStylesheet],
    tree: {
      type: 'element',
      tag: 'stack',
      props: {
        gap: 'md' as const,
        className: 'bm-detail-layout',
      },
      children: [
        // Title row with link and ID
        {
          type: 'element',
          tag: 'row',
          props: {
            className: 'bm-detail-title-row',
            itemAlign: 'start' as const,
          },
          children: [
            ...(favicon ? [favicon] : []),
            {
              type: 'element',
              tag: 'link',
              props: {
                href: bm.url,
                external: true,
                className: 'bm-detail-title',
              },
              children: [{ type: 'text' as const, value: bm.title }],
            },
            {
              type: 'element',
              tag: 'text',
              props: {
                tone: 'muted' as const,
                size: 'sm' as const,
                className: 'bm-detail-id',
              },
              children: [{ type: 'text' as const, value: `#${bm.id}` }],
            },
          ],
        },
        // Meta information
        {
          type: 'element',
          tag: 'stack',
          props: {
            gap: 'sm' as const,
            className: 'bm-detail-meta',
          },
          children: metaChildren,
        },
      ],
    },
  };
}
