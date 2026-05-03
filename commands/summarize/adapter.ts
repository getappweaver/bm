import type { BmCommandAdapter } from '../../adapter';

import { handleSummarizeCommand } from './handler';

export const adaptSummarizeCommand: BmCommandAdapter = (params) =>
  handleSummarizeCommand(params);
