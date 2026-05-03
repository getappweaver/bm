// ---------------------------------------------------------------------------
// plugins/bm/commands/accept/handler.ts
// ---------------------------------------------------------------------------

import type { HandleBmCommandProps } from '../../command-context';
import { createBm, deleteBm, updateBm } from '../../db';
import { deleteDraft, getDraft, listDrafts } from '../../drafts';
import { formatBmDetail } from '../../format';
import type { CreateBmDraft, UpdateBmInput } from '../../types';

export function handleAcceptCommand(cmd: HandleBmCommandProps): string {
  const { db, rest, identity, prefix } = cmd;
  const alias = identity.alias;

  const draftIdRaw = rest[0]?.trim();
  const draftId = draftIdRaw ? parseInt(draftIdRaw, 10) : NaN;
  const draftIdInvalid = !draftIdRaw || Number.isNaN(draftId);

  if (rest[0]?.toLowerCase() === 'all') {
    const drafts = listDrafts(db);

    if (drafts.length === 0) {
      return 'No pending drafts.';
    }

    const results: string[] = [];

    for (const draft of drafts) {
      deleteDraft(db, draft.id);

      if (draft.kind === 'create') {
        const created = createBm(db, draft.input as CreateBmDraft);
        results.push(`#${created.id} created`);
      } else if (draft.kind === 'update') {
        const updated = updateBm(db, draft.input as UpdateBmInput);

        results.push(
          updated ? `#${updated.id} updated` : `#${draft.input.id} not found`,
        );
      } else if (draft.kind === 'delete') {
        const ok = deleteBm(db, draft.input.id);

        results.push(
          ok ? `#${draft.input.id} deleted` : `#${draft.input.id} not found`,
        );
      }
    }

    return `Accepted ${results.length} draft(s):\n  ${results.join('\n  ')}`;
  }

  if (draftIdInvalid) {
    return `Usage: ${prefix}${alias} accept <draft_id> | ${prefix}${alias} accept all`;
  }

  const entry = getDraft(db, draftId);

  if (!entry) {
    return `Draft not found: #${draftId}`;
  }

  deleteDraft(db, draftId);

  if (entry.kind === 'create') {
    const created = createBm(db, entry.input as CreateBmDraft);

    return `Created #${created.id}\n${formatBmDetail(created)}`;
  }

  if (entry.kind === 'update') {
    const updated = updateBm(db, entry.input as UpdateBmInput);

    if (!updated) {
      return `Not found: #${entry.input.id}`;
    }

    return `Updated.\n${formatBmDetail(updated)}`;
  }

  const ok = deleteBm(db, entry.input.id);

  if (!ok) {
    return `Not found: #${entry.input.id}`;
  }

  return `Deleted #${entry.input.id}.`;
}
