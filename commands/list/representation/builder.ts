import type { z } from 'zod';

import type { BmListItemSchema, BmListRepresentation } from './schema';

export function createListRepresentation(params: {
  command: string;
  subcommand: string;
  groupBy: 'cats' | null;
  listInvocation: {
    arguments: Record<string, unknown>;
    options: Record<string, unknown>;
  };
  items: z.input<typeof BmListItemSchema>[];
}): BmListRepresentation {
  return {
    kind: 'list',
    version: 1,
    meta: {
      command: params.command,
      subcommand: params.subcommand,
    },
    data: {
      groupBy: params.groupBy,
      listInvocation: params.listInvocation,
      items: params.items,
    },
  };
}
