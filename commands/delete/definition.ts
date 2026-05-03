import type { SubcommandDefinition } from '@src/system/command-definition';

export const deleteDefinition = (
  prefix: string,
  alias: string,
): SubcommandDefinition => ({
  name: 'delete',
  summary: 'Delete a bookmark.',
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
  examples: [`${prefix}${alias} delete 8`],
});
