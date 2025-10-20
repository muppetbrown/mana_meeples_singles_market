// web/src/features/cards/queries.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/config/api';

type CardLite = { id: number; name: string; sku: string; finish: string; card_number: string };

export function useCardSearch(q: string) {
  return useQuery({
    queryKey: ['cards', q],
    enabled: q.trim().length > 1,
    queryFn: async () => {
      // server already sanitized & indexed; keep UI debounced
      return api.get<{ data: CardLite[] }>(`/cards?q=${encodeURIComponent(q)}`);
    },
    staleTime: 60_000,
    retry: 1,
  });
}
