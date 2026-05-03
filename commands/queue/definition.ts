import type { SubcommandDefinition } from '@src/system/command-definition';

export const queueDefinition = (
  prefix: string,
  alias: string,
): SubcommandDefinition => ({
  name: 'queue',
  summary: 'Add a bookmark to the active backlog.',
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
  examples: [`${prefix}${alias} queue 5`],
});
