// ---------------------------------------------------------------------------
// plugins/bm/format/index.ts — display helpers
// ---------------------------------------------------------------------------

export {
  formatBmCategoryCounts,
  formatBmMediaTypeCounts,
  formatBmTagCounts,
} from './counts';

export {
  KNOWN_MEDIA_TYPES,
  knownMediaTypesText,
  mediaTypeLabel,
} from './media-type';
export type { KnownMediaType } from './media-type';

export {
  formatCreateDraftList,
  formatDraftReply,
  hasDraftChildren,
} from './drafts-display';

export { formatBmDetail, formatUpdateDraftList } from './detail';

export { bookmarkFaviconNode, bookmarkFaviconUrl } from './favicon';

export type { FormatBmsOpts } from './list';
export { formatBms, formatBmsByCategory } from './list';
