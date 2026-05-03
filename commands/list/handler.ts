import type { Database } from 'bun:sqlite';

import type { Bm, BmListFilters } from '../../types';

import { listBms } from './db';

export type ListCommandResult =
  | {
      type: 'empty';
      groupBy: 'cats' | null;
      items: Bm[];
    }
  | {
      type: 'success';
      groupBy: 'cats' | null;
      items: Bm[];
    };

export function handleListCommand(params: {
  db: Database;
  filters: BmListFilters;
  groupBy: 'cats' | null;
}): ListCommandResult {
  const items = listBms(params.db, params.filters);

  if (items.length === 0) {
    return {
      type: 'empty',
      groupBy: params.groupBy,
      items,
    };
  }

  return {
    type: 'success',
    groupBy: params.groupBy,
    items,
  };
}
