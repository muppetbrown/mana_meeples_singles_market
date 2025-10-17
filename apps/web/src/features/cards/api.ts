// @ts-expect-error TS(2307): Cannot find module '@tanstack/react-query' or its ... Remove this comment to see the full error message
import { useQuery } from '@tanstack/react-query';


export function useCardSearch(q: string) {
return useQuery({
queryKey: ['cards', q],
queryFn: async () => {
const r = await fetch(`/api/cards?q=${encodeURIComponent(q)}`);
if (!r.ok) throw new Error('search failed');
return (await r.json()).data as Array<{ id: number; name: string; sku: string; finish: string; card_number: string }>;
},
enabled: q.length > 1,
});
}