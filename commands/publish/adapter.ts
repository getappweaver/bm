import type { BmCommandAdapter } from '../../adapter';

import { handlePublishCommand } from './handler';

export const adaptPublishCommand: BmCommandAdapter = (params) =>
  handlePublishCommand(params);
