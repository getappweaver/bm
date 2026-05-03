import type { BmCommandAdapter } from '../../adapter';

import { handleReviseCommand } from './handler';

export const adaptReviseCommand: BmCommandAdapter = (params) =>
  handleReviseCommand(params);
