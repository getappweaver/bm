import type { SubcommandDefinition } from '@src/system/command-definition';

export const showDefinition = (
  prefix: string,
  alias: string,
): SubcommandDefinition => ({
  name: 'show',
  summary: 'Show one bookmark by id.',
  aliases: [],
  arguments: [
    {
      name: 'id',
      summary: 'Bookmark id.',
      kind: 'integer',
      required: true,
    },
  ],
  options: [],
  examples: [`${prefix}${alias} show 4`],
});
