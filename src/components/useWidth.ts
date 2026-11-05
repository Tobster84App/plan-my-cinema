import { useEffect, useRef, useState } from 'preact/hooks';

/** Breite des Containers in px, damit Text im SVG nicht mitskaliert (bleibt auf dem Handy lesbar). */
export function useWidth(initial = 600) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}
