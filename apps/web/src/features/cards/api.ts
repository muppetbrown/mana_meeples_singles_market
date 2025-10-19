
import { useQuery } from '@tanstack/react-query';
import { api } from '../config/api';


export function useCardSearch(q: string) {
return useQuery({
queryKey: ['cards', q],
queryFn: async () => {
const response = await api.get<{ data: Array<{ id: number; name: string; sku: string; finish: string; card_number: string }> }>(`/cards?q=${encodeURIComponent(q)}`);
return response.data;
},
enabled: q.length > 1,
});
}