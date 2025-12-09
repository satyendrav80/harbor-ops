import type { RequestContext } from '../../../types/common';

export function extractParams(context: RequestContext) {
  const { name, description, startDate, endDate } = context.body;

  if (!name || typeof name !== 'string') {
    throw new Error('Name is required');
  }

  if (!startDate || !endDate) {
    throw new Error('Start date and end date are required');
  }

  return {
    name,
    description,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
  };
}
