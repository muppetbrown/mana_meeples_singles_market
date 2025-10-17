import { useEffect, useRef } from 'react';


export default function Announcer({ message }: { message: string }) {
const ref = useRef<HTMLDivElement>(null);
useEffect(() => { if (ref.current) ref.current.textContent = message; }, [message]);
return (
<div aria-live="polite" aria-atomic="true" className="sr-only" ref={ref} />
);
}