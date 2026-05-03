import type { SubcommandDefinition } from '@src/system/command-definition';

export const nextDefinition = (
  prefix: string,
  alias: string,
): SubcommandDefinition => ({
  name: 'next',
  summary:
    'Oldest unconsumed match (prefers queue); optional media type and filters.',
  aliases: [],
  arguments: [
    {
      name: 'media_type',
      summary: 'Optional media type filter.',
      kind: 'string',
    },
  ],
  options: [
    {
      name: 'tag',
      summary: 'Require tag (repeatable).',
      flag: '--tag',
      shortFlag: null,
      kind: 'string',
    },
    {
      name: 'tags',
      summary: 'Comma-separated tags (all required).',
      flag: '--tags',
      shortFlag: null,
      kind: 'string',
    },
    {
      name: 'category',
      summary: 'Category path filter.',
      flag: '--category',
      shortFlag: null,
      kind: 'string',
    },
  ],
  examples: [
    `${prefix}${alias} next`,
    `${prefix}${alias} next video --tag nostr`,
  ],
});
