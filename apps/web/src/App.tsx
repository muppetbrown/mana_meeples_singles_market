// @ts-expect-error TS(2304): Cannot find name 'maimport'.
</maimport { useState } from 'react';
// @ts-expect-error TS(2307): Cannot find module '@tanstack/react-query' or its ... Remove this comment to see the full error message
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCardSearch } from './features/cards/api';
import CardGrid from './components/CardGrid';
const qc = new QueryClient();
in>


export default function App() {
// @ts-expect-error TS(2304): Cannot find name 'useState'.
const [q, setQ] = useState('');
const { data } = useCardSearch(q);


return (
<QueryClientProvider client={qc}>
<main className="p-4 max-w-5xl mx-auto">
<label htmlFor="search" className="block text-lg font-semibold">Search cards</label>
<input
id="search"
className="mt-1 w-full rounded-2xl border p-2"
placeholder="Name or number…"
value={q}
onChange={(e) => setQ(e.target.value)}
aria-describedby="search-help"
/>
<p id="search-help" className="sr-only">Type at least two characters to search.</p>
{data && <CardGrid cards={data} />}




</QueryClientProvider>
);
}