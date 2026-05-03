import type { Database } from 'bun:sqlite';

import { listBms as listBookmarks } from '../../db';
import type { Bm, BmListFilters } from '../../types';

export function listBms(db: Database, filters: BmListFilters): Bm[] {
  return listBookmarks({ db, filters });
}
