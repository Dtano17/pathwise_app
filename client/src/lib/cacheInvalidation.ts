import { queryClient } from './queryClient';

export function invalidateActivitiesCache() {
  queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
}

export function invalidateJournalCache() {
  queryClient.invalidateQueries({ queryKey: ['/api/journal/entries'] });
}
