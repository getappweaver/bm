import type { WebAction, WebNode, WebNodeRoot } from '@src/web/ui-schema';

import type { BmDraftRow } from '../../../drafts';
import type { Bm, CreateBmDraft, UpdateBmInput } from '../../../types';

type RenderDraftsWebProps = {
  command: string;
  drafts: BmDraftRow[];
  getBookmarkById: ((id: number) => Bm | null) | null;
};

function listRefresh(command: string) {
  return {
    command,
    subcommand: 'list',
    arguments: {},
    options: { by: 'cats' },
  };
}

function acceptDraftAction(command: string, draftId: number): WebAction {
  return {
    type: 'command',
    command,
    subcommand: 'accept',
    arguments: { target: String(draftId) },
    options: {},
    recordInTimeline: false,
    refresh: listRefresh(command),
  };
}

function declineDraftAction(command: string, draftId: number): WebAction {
  return {
    type: 'command',
    command,
    subcommand: 'decline',
    arguments: { draft_id: draftId },
    options: {},
    recordInTimeline: false,
    refresh: {
      command,
      subcommand: 'drafts',
      arguments: {},
      options: {},
    },
  };
}

function reviseDraftForm(command: string, draftId: number): WebNode {
  return {
    type: 'element',
    tag: 'form',
    props: {
      className: 'web-form web-form--stacked bm-draft-revise-form',
      action: {
        type: 'command',
        command,
        subcommand: 'revise',
        arguments: { draft_id: draftId },
        options: {},
        recordInTimeline: false,
        refresh: {
          command,
          subcommand: 'drafts',
          arguments: { draft_id: draftId },
          options: {},
        },
      },
    },
    children: [
      {
        type: 'element',
        tag: 'textField',
        props: {
          formFieldName: 'corrections',
          inputPlaceholder: 'Revise this draft…',
        },
      },
      {
        type: 'element',
        tag: 'button',
        props: { label: 'Revise', htmlType: 'submit' },
      },
    ],
  };
}

function draftTitle(
  draft: BmDraftRow,
  getBookmarkById: ((id: number) => Bm | null) | null,
): string {
  if (draft.kind === 'create') {
    return (draft.input as CreateBmDraft).title;
  }

  if (draft.kind === 'update') {
    const input = draft.input as UpdateBmInput;
    const existing = getBookmarkById?.(input.id);

    return existing
      ? `Update ${existing.title}`
      : `Update bookmark #${input.id}`;
  }

  return `Delete bookmark #${draft.input.id}`;
}

function formatOptional(value: string | null | undefined): string {
  return value == null || value === '' ? '(empty)' : value;
}

function formatBoolean(value: boolean): string {
  return value ? 'yes' : 'no';
}

type DetailDiffRowProps = {
  label: string;
  before: string;
  after: string;
};

function detailDiffRow({ label, before, after }: DetailDiffRowProps): WebNode {
  return detailRow(label, `${before} -> ${after}`);
}

function updateDraftDetails(
  input: UpdateBmInput,
  existing: Bm | null,
): WebNode[] {
  if (!existing) {
    return [
      detailRow('Target', `#${input.id}`),
      ...(input.title ? [detailRow('Title', input.title)] : []),
      ...(input.url ? [detailRow('URL', input.url)] : []),
      ...(input.category ? [detailRow('Category', input.category)] : []),
      ...(input.media_type ? [detailRow('Media', input.media_type)] : []),
      ...(input.tags ? [detailRow('Tags', input.tags)] : []),
    ];
  }

  return [
    detailRow('Target', `#${existing.id} ${existing.title}`),
    detailRow('URL', existing.url),
    ...(input.title
      ? [
          detailDiffRow({
            label: 'Title',
            before: existing.title,
            after: input.title,
          }),
        ]
      : []),
    ...(input.url
      ? [
          detailDiffRow({
            label: 'URL',
            before: existing.url,
            after: input.url,
          }),
        ]
      : []),
    ...(input.category
      ? [
          detailDiffRow({
            label: 'Category',
            before: existing.category,
            after: input.category,
          }),
        ]
      : []),
    ...(input.media_type
      ? [
          detailDiffRow({
            label: 'Media',
            before: existing.media_type,
            after: input.media_type,
          }),
        ]
      : []),
    ...(input.tags
      ? [
          detailDiffRow({
            label: 'Tags',
            before: existing.tags,
            after: input.tags,
          }),
        ]
      : []),
    ...(input.summary !== undefined
      ? [
          detailDiffRow({
            label: 'Summary',
            before: formatOptional(existing.summary),
            after: formatOptional(input.summary),
          }),
        ]
      : []),
    ...(input.description !== undefined
      ? [
          detailDiffRow({
            label: 'Description',
            before: formatOptional(existing.description),
            after: formatOptional(input.description),
          }),
        ]
      : []),
    ...(input.in_queue !== undefined
      ? [
          detailDiffRow({
            label: 'Queue',
            before: formatBoolean(existing.in_queue),
            after: formatBoolean(input.in_queue),
          }),
        ]
      : []),
  ];
}

function draftDetails(
  draft: BmDraftRow,
  getBookmarkById: ((id: number) => Bm | null) | null,
): WebNode[] {
  if (draft.kind === 'create') {
    const input = draft.input as CreateBmDraft;

    return [
      detailRow('URL', input.url),
      detailRow('Category', input.category),
      detailRow('Media', input.media_type),
      detailRow('Tags', input.tags),
      ...(input.summary ? [detailRow('Summary', input.summary)] : []),
      ...(input.description
        ? [detailRow('Description', input.description)]
        : []),
    ];
  }

  if (draft.kind === 'update') {
    const input = draft.input as UpdateBmInput;

    return updateDraftDetails(input, getBookmarkById?.(input.id) ?? null);
  }

  return [detailRow('Target', `#${draft.input.id}`)];
}

function detailRow(label: string, value: string): WebNode {
  return {
    type: 'element',
    tag: 'row',
    props: { className: 'bm-draft-detail-row', gap: 'sm' },
    children: [
      {
        type: 'element',
        tag: 'text',
        props: {
          className: 'bm-draft-detail-label',
          tone: 'muted',
          size: 'sm',
        },
        children: [{ type: 'text', value: label }],
      },
      {
        type: 'element',
        tag: 'text',
        props: { size: 'sm' },
        children: [{ type: 'text', value }],
      },
    ],
  };
}

type RenderDraftItemProps = {
  command: string;
  draft: BmDraftRow;
  getBookmarkById: ((id: number) => Bm | null) | null;
};

function renderDraftItem({
  command,
  draft,
  getBookmarkById,
}: RenderDraftItemProps): WebNode {
  const title = draftTitle(draft, getBookmarkById);

  return {
    type: 'element',
    tag: 'treeItem',
    props: {
      id: `bm-draft-${draft.id}`,
      defaultExpanded: true,
      filterText: `${draft.id} ${draft.kind} ${title}`,
      filterName: title,
    },
    summary: {
      type: 'element',
      tag: 'row',
      props: { className: 'bm-draft-row', gap: 'sm', itemAlign: 'center' },
      children: [
        {
          type: 'element',
          tag: 'stack',
          props: { fill: true, gap: 'xs' },
          children: [
            {
              type: 'element',
              tag: 'row',
              props: { gap: 'xs', itemAlign: 'baseline' },
              children: [
                {
                  type: 'element',
                  tag: 'text',
                  props: { weight: 'semibold' },
                  children: [{ type: 'text', value: title }],
                },
                {
                  type: 'element',
                  tag: 'badge',
                  props: {
                    label: `#${draft.id} ${draft.kind}`,
                    tone: 'info',
                    size: 'sm',
                  },
                },
              ],
            },
          ],
        },
        {
          type: 'element',
          tag: 'row',
          props: { gap: 'xs' },
          children: [
            {
              type: 'element',
              tag: 'button',
              props: {
                label: 'Accept',
                action: acceptDraftAction(command, draft.id),
              },
            },
            {
              type: 'element',
              tag: 'button',
              props: {
                label: 'Decline',
                tone: 'danger',
                action: declineDraftAction(command, draft.id),
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
        props: { className: 'bm-draft-details', gap: 'xs' },
        children: [
          ...draftDetails(draft, getBookmarkById),
          ...(draft.kind === 'create'
            ? [reviseDraftForm(command, draft.id)]
            : []),
        ],
      },
    ],
  };
}

const draftsStylesheet = {
  id: 'bm-drafts-web',
  cssText: `
    .web-stack.bm-drafts-layout { gap: 0.55rem; }
    .web-tree.bm-drafts-tree { gap: 0.4rem; }
    .web-row.bm-draft-row { justify-content: space-between; padding: 0.25rem; }
    .web-stack.bm-draft-details {
      padding: 0.45rem 0.65rem;
      border-left: 2px solid color-mix(in srgb, var(--color-accent) 70%, transparent);
      background: color-mix(in srgb, var(--color-surface-alt) 94%, var(--color-accent) 6%);
    }
    .web-row.bm-draft-detail-row { align-items: baseline; }
    .web-text.bm-draft-detail-label { min-width: 5.5rem; font-weight: 700; }
    .web-form.bm-draft-revise-form.web-form--stacked {
      gap: 0.35rem;
      margin-top: 0.25rem;
      padding-top: 0.35rem;
      border-top: 1px solid color-mix(in srgb, var(--color-border) 65%, transparent);
    }
  `,
} as const;

export function renderDraftsWeb({
  command,
  drafts,
  getBookmarkById,
}: RenderDraftsWebProps): WebNodeRoot {
  return {
    kind: 'ui',
    version: 1,
    meta: { command, subcommand: 'drafts' },
    tree: {
      type: 'element',
      tag: 'stack',
      props: { className: 'bm-drafts-layout', gap: 'md' },
      children: [
        {
          type: 'element',
          tag: 'text',
          props: { weight: 'bold' },
          children: [
            {
              type: 'text',
              value:
                drafts.length === 0
                  ? 'No pending drafts.'
                  : `${drafts.length} pending draft${drafts.length === 1 ? '' : 's'}`,
            },
          ],
        },
        {
          type: 'element',
          tag: 'tree',
          props: {
            className: 'bm-drafts-tree',
            filterable: true,
            filterPlaceholder: 'Filter drafts',
          },
          children: drafts.map((draft) =>
            renderDraftItem({ command, draft, getBookmarkById }),
          ),
        },
      ],
    },
    stylesheets: [draftsStylesheet],
  };
}
