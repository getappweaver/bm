import type { z } from 'zod';

import type { BmDetailRepresentation } from './schema';
import type { BmDetailSchema } from './schema';

export function createDetailRepresentation(params: {
  command: string;
  subcommand: string;
  bookmark: z.infer<typeof BmDetailSchema>;
}): BmDetailRepresentation {
  return {
    kind: 'show',
    version: 1,
    meta: {
      command: params.command,
      subcommand: params.subcommand,
    },
    data: {
      bookmark: params.bookmark,
    },
  };
}
