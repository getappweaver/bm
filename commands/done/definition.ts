import type { SubcommandDefinition } from '@src/system/command-definition';

export const doneDefinition = (
  prefix: string,
  alias: string,
): SubcommandDefinition => ({
  name: 'done',
  summary: 'Mark a bookmark consumed and remove it from the queue.',
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
  examples: [`${prefix}${alias} done 12`],
});
