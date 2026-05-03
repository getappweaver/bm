import { formatBms, formatBmsByCategory } from '../../../format';

import type { BmListRepresentation } from '../representation/schema';

export function renderListText(representation: BmListRepresentation): string {
  if (representation.data.groupBy === 'cats') {
    return formatBmsByCategory(representation.data.items);
  }

  return formatBms(representation.data.items);
}
