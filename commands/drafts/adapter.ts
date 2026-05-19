import type { BmCommandAdapter } from '../../adapter';
import { getDraft, listDrafts } from '../../drafts';

import { handleDraftsCommand } from './handler';
import { renderDraftsWeb } from './renderers/web';

export const adaptDraftsCommand: BmCommandAdapter = (params) => {
  if (params.source !== 'web') {
    return handleDraftsCommand(params);
  }

  const idRaw = params.rest[0]?.trim();

  if (idRaw) {
    const id = parseInt(idRaw, 10);

    if (Number.isNaN(id)) {
      return handleDraftsCommand(params);
    }

    const draft = getDraft(params.db, id);

    return renderDraftsWeb({
      command: params.identity.alias,
      drafts: draft ? [draft] : [],
    });
  }

  return renderDraftsWeb({
    command: params.identity.alias,
    drafts: listDrafts(params.db),
  });
};
