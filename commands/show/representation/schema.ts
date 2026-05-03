import { z } from 'zod';

import { createRepresentationSchema } from '@src/system/representation';

export const BmDetailSchema = z.object({
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

export const BmDetailDataSchema = z.object({
  bookmark: BmDetailSchema,
});

export const BmDetailRepresentationSchema = createRepresentationSchema(
  BmDetailDataSchema,
).extend({
  kind: z.literal('show'),
});

export type BmDetail = z.infer<typeof BmDetailSchema>;
export type BmDetailRepresentation = z.infer<
  typeof BmDetailRepresentationSchema
>;
