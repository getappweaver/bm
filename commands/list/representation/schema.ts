import { z } from 'zod';

import { createRepresentationSchema } from '@src/system/representation';

export const BmListItemSchema = z.object({
  id: z.number().int().positive(),
  url: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().nullable(),
  description: z.string().nullable(),
  category: z.string().min(1),
  tags: z.string().min(1),
  media_type: z.string().min(1),
  in_queue: z.boolean(),
  consumed_at: z.number().nullable(),
  created_at: z.number(),
  nostr_naddr: z.string().nullable(),
  published_at: z.number().nullable(),
});

export const BmListDataSchema = z.object({
  groupBy: z.enum(['cats']).nullable(),
  listInvocation: z.object({
    arguments: z.record(z.string(), z.unknown()),
    options: z.record(z.string(), z.unknown()),
  }),
  items: z.array(BmListItemSchema),
});

export const BmListRepresentationSchema = createRepresentationSchema(
  BmListDataSchema,
).extend({
  kind: z.literal('list'),
});

export type BmListRepresentation = z.infer<typeof BmListRepresentationSchema>;
