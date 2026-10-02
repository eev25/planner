import { memo, useEffect, useLayoutEffect, useRef } from 'react';
import MonthGrid from '../MonthGrid/MonthGrid';
import './YearView.css';

const EDGE_MARGIN = '1500px 0px';

function YearView({ range, canExtendPrev, canExtendNext, onNeedPrev, onNeedNext }) {
  const containerRef = useRef(null);
  const topRef = useRef(null);
  const bottomRef = useRef(null);
  const prevStartRef = useRef(range.start);

  // When years are prepended, keep the viewport anchored on the same content.
  // (Native scroll anchoring is disabled in index.css so this is the only correction.)
  useLayoutEffect(() => {
    const prevStart = prevStartRef.current;
    prevStartRef.current = range.start;
    if (range.start >= prevStart) return;
    const container = containerRef.current;
    const anchor = document.querySelector(`#year-${prevStart} .year-section__heading`);
    if (!container || !anchor) return;
    const paddingTop = parseFloat(getComputedStyle(container).paddingTop) || 0;
    const added = anchor.offsetTop - paddingTop;
    if (added > 0) window.scrollBy({ top: added, behavior: 'instant' });
  }, [range.start]);

  // A fresh observer per range change re-fires its initial callback, so the range
  // keeps growing until the sentinel is far enough from the viewport.
  useEffect(() => {
    if (!canExtendPrev || !topRef.current) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onNeedPrev(); },
      { rootMargin: EDGE_MARGIN }
    );
    io.observe(topRef.current);
    return () => io.disconnect();
  }, [range.start, canExtendPrev, onNeedPrev]);

  useEffect(() => {
    if (!canExtendNext || !bottomRef.current) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onNeedNext(); },
      { rootMargin: EDGE_MARGIN }
    );
    io.observe(bottomRef.current);
    return () => io.disconnect();
  }, [range.end, canExtendNext, onNeedNext]);

  const years = [];
  for (let y = range.start; y <= range.end; y++) years.push(y);

  return (
    <div className="year-view" ref={containerRef}>
      <div ref={topRef} className="year-view__sentinel year-view__sentinel--top" aria-hidden="true" />
      {years.map(y => (
        <section key={y} id={`year-${y}`} className="year-section" data-year={y}>
          <h2 className="year-section__heading">{y}</h2>
          {Array.from({ length: 12 }, (_, m) => (
            <MonthGrid key={m} year={y} month={m} />
          ))}
        </section>
      ))}
      <div ref={bottomRef} className="year-view__sentinel year-view__sentinel--bottom" aria-hidden="true" />
    </div>
  );
}

export default memo(YearView);
