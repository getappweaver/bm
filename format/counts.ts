// ---------------------------------------------------------------------------
// plugins/bm/format/counts.ts — taxonomy count lines
// ---------------------------------------------------------------------------

import type { BmCategoryCount, BmMediaTypeCount, BmTagCount } from '../types';

export function formatBmTagCounts(rows: BmTagCount[]): string {
  return rows.map((r) => `  ${r.tag}  ${r.count}`).join('\n');
}

export function formatBmCategoryCounts(rows: BmCategoryCount[]): string {
  return rows.map((r) => `  ${r.category}  ${r.count}`).join('\n');
}

export function formatBmMediaTypeCounts(rows: BmMediaTypeCount[]): string {
  return rows.map((r) => `  ${r.media_type}  ${r.count}`).join('\n');
}
