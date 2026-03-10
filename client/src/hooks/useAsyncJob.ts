import { useQuery } from '@tanstack/react-query';

interface AsyncJobData {
  status: 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

export function useAsyncJob(jobId: string | null) {
  return useQuery<AsyncJobData>({
    queryKey: ['/api/jobs', jobId],
    enabled: !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 2000;
      if (data.status === 'completed' || data.status === 'failed') return false;
      return 2000;
    },
    staleTime: 0,
  });
}
