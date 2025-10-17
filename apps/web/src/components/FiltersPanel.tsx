import { useEffect, useRef } from 'react';


type FilterRow = { treatment?: string; border_color?: string; finish?: string; promo_type?: string; frame_effect?: string };


export default function FiltersPanel() {
// @ts-expect-error TS(2304): Cannot find name 'useState'.
const [data, setData] = useState<FilterRow[]>([]);
const announceRef = useRef<HTMLDivElement>(null);


useEffect(() => { (async () => { const r = await fetch('/api/filters'); setData((await r.json()).data ?? []); })(); }, []);
useEffect(() => { if (announceRef.current) announceRef.current.textContent = `Loaded ${data.length} filter values`; }, [data]);


return (
  <aside aria-labelledby="filters-heading" className="p-3 border rounded-2xl">
  <h2 id="filters-heading" className="text-lg font-semibold">Filters</h2>
  <div aria-live="polite" aria-atomic="true" className="sr-only" ref={announceRef} />
  <ul className="mt-2 grid gap-2">
  {data.slice(0, 50).map((row: any, i: any) => (
  <li key={i} className="text-sm">
  {row.finish && <span className="mr-2">Finish: <strong className="uppercase">{row.finish}</strong></span>}
  {row.treatment && <span className="mr-2">Treatment: {row.treatment}</span>}
  {row.border_color && <span className="mr-2">Border: {row.border_color}</span>}
  {row.promo_type && <span className="mr-2">Promo: {row.promo_type}</span>}
  {row.frame_effect && <span className="mr-2">Frame: {row.frame_effect}</span>}
  </li>
  ))}
  </ul>
  </aside>
);
}