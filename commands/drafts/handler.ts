// ---------------------------------------------------------------------------
// plugins/bm/commands/drafts/handler.ts
// ---------------------------------------------------------------------------

import type { HandleBmCommandProps } from '../../command-context';
import { getDraft, listDrafts } from '../../drafts';
import { formatCreateDraftList, formatDraftReply } from '../../format';
import type { CreateBmDraft, UpdateBmInput } from '../../types';

export function handleDraftsCommand(cmd: HandleBmCommandProps): string {
  const { db, rest, identity, prefix } = cmd;
  const alias = identity.alias;
  const idRaw = rest[0]?.trim();
  const drafts = listDrafts(db);

  if (idRaw) {
    const id = parseInt(idRaw, 10);

    if (Number.isNaN(id)) {
      return `Usage: ${prefix}${alias} drafts [draft_id]`;
    }

    const entry = getDraft(db, id);

    if (!entry) {
      return `Draft not found: #${id}`;
    }

    const cmdStr = `${prefix}${alias}`;

    if (entry.kind === 'create') {
      return [
        `Draft #${id} [create]:`,
        '',
        formatCreateDraftList(entry.input as CreateBmDraft),
        '',
        formatDraftReply(cmdStr, id, 'create'),
      ].join('\n');
    }

    if (entry.kind === 'update') {
      return [
        `Draft #${id} [update]:`,
        `  target id: ${(entry.input as UpdateBmInput).id}`,
        '',
        formatDraftReply(cmdStr, id, 'update'),
      ].join('\n');
    }

    return [
      `Draft #${id} [delete]:`,
      `  target id: ${(entry.input as { id: number }).id}`,
      '',
      formatDraftReply(cmdStr, id, 'delete'),
    ].join('\n');
  }

  if (drafts.length === 0) {
    return 'No pending drafts.';
  }

  const cmdStr = `${prefix}${alias}`;
  const lines = drafts.map((d) => `#${d.id} [${d.kind}]`);

  return [
    'Pending drafts:',
    '',
    ...lines,
    '',
    `Accept all: ${cmdStr} accept all`,
  ].join('\n');
}
