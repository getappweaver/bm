import type { SubcommandDefinition } from '@src/system/command-definition';

export const updateDefinition = (
  prefix: string,
  alias: string,
): SubcommandDefinition => ({
  name: 'update',
  summary:
    'Draft a single-field update (url, title, summary, description, category, tags, media_type, in_queue).',
  aliases: [],
  arguments: [
    {
      name: 'id',
      summary: 'Bookmark id.',
      kind: 'integer',
      required: true,
    },
    {
      name: 'field',
      summary: 'Field name to change.',
      kind: 'string',
      required: true,
    },
    {
      name: 'value',
      summary: 'New value (use --clear on the CLI for nullable fields).',
      kind: 'string',
      required: true,
      variadic: true,
    },
  ],
  options: [
    {
      name: 'clear',
      summary: 'Clear a nullable field (CLI; summary/description).',
      flag: '--clear',
      shortFlag: null,
      kind: 'boolean',
    },
  ],
  examples: [
    `${prefix}${alias} update 3 title My bookmark`,
    `${prefix}${alias} update 2 summary --clear`,
  ],
});
