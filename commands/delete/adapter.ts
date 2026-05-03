import type { BmCommandAdapter } from '../../adapter';

import { handleDeleteCommand } from './handler';

export const adaptDeleteCommand: BmCommandAdapter = (params) =>
  handleDeleteCommand(params);
