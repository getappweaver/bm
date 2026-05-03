import type { BmCommandAdapter } from '../../adapter';

import { handleTypesCommand } from './handler';

export const adaptTypesCommand: BmCommandAdapter = (params) =>
  handleTypesCommand(params);
