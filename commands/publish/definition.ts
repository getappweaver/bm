import type { SubcommandDefinition } from '@src/system/command-definition';

export const publishDefinition = (
  prefix: string,
  alias: string,
): SubcommandDefinition => ({
  name: 'publish',
  summary: 'Publish one bookmark via bunker signer.',
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
  examples: [`${prefix}${alias} publish 4`],
});
