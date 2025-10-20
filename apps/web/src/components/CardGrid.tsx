// apps/web/src/components/CardGrid.tsx
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';


type Card = { id: number; name: string; sku: string; finish: string; card_number: string };


export default function CardGrid({ cards }: { cards: Card[] }) {
const parentRef = useRef<HTMLDivElement>(null);
const rowVirtualizer = useVirtualizer({
count: cards.length,
getScrollElement: () => parentRef.current,
estimateSize: () => 112,
});


return (
  <div ref={parentRef} className="h-[70vh] overflow-auto border rounded-2xl p-2" role="grid" aria-rowcount={cards.length}>
  <div style={{ height: rowVirtualizer.getTotalSize(), width: '100%', position: 'relative' }}>
  {rowVirtualizer.getVirtualItems().map((v: any) => {
  const c = cards[v.index];
  return (
  <div

  key={c.id}
  role="row"
  aria-rowindex={v.index + 1}
  className="absolute left-0 right-0 p-2"
  style={{ transform: `translateY(${v.start}px)` }}
  >
  <article role="gridcell" className="rounded-2xl border p-3 shadow-sm">
  // @ts-expect-error TS(2532): Object is possibly 'undefined'.
  <h3 className="text-base font-semibold">{c.name}</h3>
  // @ts-expect-error TS(2532): Object is possibly 'undefined'.
  <p className="text-sm opacity-80">#{c.card_number} — <span className="uppercase">{c.finish}</span></p>
  // @ts-expect-error TS(2532): Object is possibly 'undefined'.
  <a className="underline focus:outline-none focus:ring-2 rounded-sm" href={`/${c.sku}`}>View</a>
  </article>
  </div>
  );
  })}
  </div>
  </div>
);
}