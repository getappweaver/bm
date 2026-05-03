import type { BmCommandAdapter } from '../../adapter';

import { handleAiCommand } from './handler';

export const adaptAiCommand: BmCommandAdapter = (params) =>
  handleAiCommand(params);
