import type { SubcommandDefinition } from '@src/system/command-definition';

export const publishDefinition = (
  prefix: string,
  alias: string,
): SubcommandDefinition => ({
  name: 'publish',
  summary: 'Publish one bookmark or mark it published with a Nostr event URL.',
  aliases: [],
  arguments: [
    {
      name: 'id',
      summary: 'Bookmark id.',
      kind: 'integer',
      required: true,
    },
    {
      name: 'nostrUrl',
      summary: 'nostr://nevent URL for the published bookmark.',
      kind: 'string',
      required: false,
    },
  ],
  options: [],
  examples: [
    `${prefix}${alias} publish 4`,
    `${prefix}${alias} publish 4 nostr://nevent1...`,
  ],
});
