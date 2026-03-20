// ---------------------------------------------------------------------------
// plugins/bm/context.ts — Tag/category snapshot for agents and !bm context
// ---------------------------------------------------------------------------
import type { Database } from 'bun:sqlite';

import { listBmCategoryCounts, listBmTagCounts } from './db';

type BuildBmPluginContextTextProps = {
  db: Database;
};

/** Taxonomy-only context for agents and `bun src/cli.ts bm context`. */
export function buildBmPluginContextText({
  db,
}: BuildBmPluginContextTextProps): string {
  const tagCounts = listBmTagCounts(db);
  const catCounts = listBmCategoryCounts(db);

  const categoriesContext =
    catCounts.length > 0
      ? catCounts.map((c) => `${c.category} (${c.count})`).join(', ')
      : '(none yet)';

  const tagsContext =
    tagCounts.length > 0
      ? tagCounts.map((t) => `${t.tag} (${t.count})`).join(', ')
      : '(none yet)';

  return [
    `Current categories: ${categoriesContext}`,
    `Current tags: ${tagsContext}`,
  ].join('\n');
}
