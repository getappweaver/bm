// ---------------------------------------------------------------------------
// plugins/bm/commands/update/handler.ts
// ---------------------------------------------------------------------------

import type { HandleBmCommandProps } from '../../command-context';
import { getBm } from '../../db';
import { createDraftSessionId, storeDraft } from '../../drafts/index';
import { formatDraftReply, formatUpdateDraftList } from '../../format';
import type { UpdateBmInput } from '../../types';
import { UpdateBmInputSchema } from '../../types';

const UPDATABLE_FIELDS = [
  'url',
  'title',
  'summary',
  'description',
  'category',
  'tags',
  'media_type',
  'in_queue',
] as const;

type UpdatableField = (typeof UPDATABLE_FIELDS)[number];

export function handleUpdateCommand(cmd: HandleBmCommandProps): string {
  const { db, rest, identity, prefix } = cmd;
  const alias = identity.alias;

  const idRaw = rest[0]?.trim();
  const field = rest[1]?.trim()?.toLowerCase() as UpdatableField | undefined;
  const valueParts = rest.slice(2);

  if (!idRaw || !field || valueParts.length === 0) {
    return [
      `Usage: ${prefix}${alias} update <id> <field> <value>`,
      '',
      `Fields: ${UPDATABLE_FIELDS.join(', ')}`,
      `For summary/description use --clear to remove the value.`,
      `For in_queue use: true, false, yes, no, 1, 0`,
    ].join('\n');
  }

  const id = parseInt(idRaw, 10);

  if (Number.isNaN(id)) {
    return `Usage: ${prefix}${alias} update <id> <field> <value> (id must be a number)`;
  }

  if (!UPDATABLE_FIELDS.includes(field as UpdatableField)) {
    return [
      `Unknown field: ${field}`,
      `Fields: ${UPDATABLE_FIELDS.join(', ')}`,
    ].join('\n');
  }

  const existing = getBm(db, id);

  if (!existing) {
    return `Not found: #${id}`;
  }

  const rawValue = valueParts.join(' ').trim();
  const isClear = rawValue === '--clear';

  let updateInput: UpdateBmInput;

  if (field === 'in_queue') {
    const truthy = ['true', 'yes', '1'];
    const falsy = ['false', 'no', '0'];

    if (!truthy.includes(rawValue) && !falsy.includes(rawValue)) {
      return `in_queue value must be one of: true, false, yes, no, 1, 0`;
    }

    updateInput = { id, in_queue: truthy.includes(rawValue) };
  } else if (field === 'summary' || field === 'description') {
    updateInput = { id, [field]: isClear ? null : rawValue };
  } else {
    if (isClear) {
      return `${field} cannot be cleared (it is required). Provide a new value.`;
    }

    updateInput = { id, [field]: rawValue };
  }

  const parsed = UpdateBmInputSchema.safeParse(updateInput);

  if (!parsed.success) {
    return `Validation error: ${parsed.error.issues.map((i) => i.message).join('; ')}`;
  }

  const draftId = storeDraft(db, {
    sessionId: createDraftSessionId(),
    agentSessionId: null,
    kind: 'update',
    input: parsed.data,
    originalPrompt: `${prefix}${alias} update ${id} ${field} ${rawValue}`,
  });

  return [
    `Draft #${draftId} [update]:`,
    '',
    formatUpdateDraftList(existing, parsed.data),
    '',
    formatDraftReply(`${prefix}${alias}`, draftId, 'update'),
  ].join('\n');
}
