// ---------------------------------------------------------------------------
// plugins/bm/commands/decline/handler.ts
// ---------------------------------------------------------------------------

import type { HandleBmCommandProps } from '../../command-context';
import { deleteDraft, getDraft } from '../../drafts';

export function handleDeclineCommand(cmd: HandleBmCommandProps): string {
  const { db, rest, identity, prefix } = cmd;
  const alias = identity.alias;

  const draftIdRaw = rest[0]?.trim();
  const draftId = draftIdRaw ? parseInt(draftIdRaw, 10) : NaN;
  const draftIdInvalid = !draftIdRaw || Number.isNaN(draftId);

  if (draftIdInvalid) {
    return `Usage: ${prefix}${alias} decline <draft_id>`;
  }

  if (!getDraft(db, draftId)) {
    return `Draft not found: #${draftId}`;
  }

  deleteDraft(db, draftId);

  return `Draft #${draftId} discarded.`;
}
