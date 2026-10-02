import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { CalendarProvider } from './context/CalendarContext';
import { useDrag } from './hooks/useDrag';
import YearView from './components/YearView/YearView';
import BlockPopover from './components/BlockPopover/BlockPopover';
import EventList from './components/EventList/EventList';
import Minimap from './components/Minimap/Minimap';
import DataTransfer from './components/DataTransfer/DataTransfer';
import { measureSlimHeaderHeight, scrollToElement } from './utils/scrollUtils';
import './App.css';

const TODAY = new Date();
const BASE_YEAR = TODAY.getFullYear();
const MIN_YEAR = BASE_YEAR - 50;
const MAX_YEAR = BASE_YEAR + 50;

function CalendarApp() {
  const [range, setRange] = useState({ start: BASE_YEAR - 1, end: BASE_YEAR + 1 });
  const [visibleYear, setVisibleYear] = useState(BASE_YEAR);
  const rangeRef = useRef(range);
  const pendingRef = useRef(null);
  const sentinelRef = useRef(null);
  const headerRef = useRef(null);
  const [isSlim, setIsSlim] = useState(false);
  const [isMinimapOpen, setIsMinimapOpen] = useState(false);
  const [isEventListOpen, setIsEventListOpen] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsSlim(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const update = () => {
      const h = header.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--header-height', `${h}px`);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(header);
    header.addEventListener('transitionend', update);
    return () => {
      ro.disconnect();
      header.removeEventListener('transitionend', update);
    };
  }, []);

  // Run work queued by ensureYear once the newly requested years are in the DOM.
  // Child layout effects (YearView's scroll compensation) have already run by now.
  useLayoutEffect(() => {
    rangeRef.current = range;
    const pending = pendingRef.current;
    pendingRef.current = null;
    pending?.();
  }, [range]);

  // Land on the current month on first paint.
  useLayoutEffect(() => {
    measureSlimHeaderHeight();
    scrollToElement(document.getElementById(`month-${BASE_YEAR}-${TODAY.getMonth()}`), 'instant');
    const onResize = () => measureSlimHeaderHeight();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // The year under the viewport's center drives the header label.
  useEffect(() => {
    let raf = 0;
    const compute = () => {
      raf = 0;
      const mid = window.innerHeight / 2;
      for (const section of document.querySelectorAll('.year-section')) {
        const r = section.getBoundingClientRect();
        if (r.top <= mid && r.bottom > mid) {
          setVisibleYear(Number(section.dataset.year));
          return;
        }
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(compute); };
    compute();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [range]);

  const extendPrev = useCallback(() => {
    setRange(r => (r.start > MIN_YEAR ? { ...r, start: r.start - 1 } : r));
  }, []);
  const extendNext = useCallback(() => {
    setRange(r => (r.end < MAX_YEAR ? { ...r, end: r.end + 1 } : r));
  }, []);

  // Mounts every year between the current range and `year`, then calls `callback`.
  const ensureYear = useCallback((year, callback) => {
    const target = Math.min(MAX_YEAR, Math.max(MIN_YEAR, year));
    const r = rangeRef.current;
    if (target >= r.start && target <= r.end) {
      callback();
      return;
    }
    pendingRef.current = callback;
    setRange({ start: Math.min(r.start, target), end: Math.max(r.end, target) });
  }, []);

  const jumpToYear = (year) => {
    ensureYear(year, () => scrollToElement(document.getElementById(`year-${year}`), 'smooth'));
  };

  useDrag(); // registers global mouse event listeners
  return (
    <>
      <header ref={headerRef} className={`app-header${isSlim ? ' app-header--slim' : ''}`}>
        <button
          className="minimap-toggle"
          onClick={() => { setIsMinimapOpen(o => !o); setIsEventListOpen(false); }}
          aria-label="Toggle map panel"
          aria-expanded={isMinimapOpen}
        >
          Map
        </button>
        <div className="year-selector">
          <button
            className="year-selector__btn"
            onClick={() => jumpToYear(visibleYear - 1)}
            disabled={visibleYear <= MIN_YEAR}
            aria-label="Previous year"
          >
            ←
          </button>
          <span className="year-selector__label">{visibleYear}</span>
          <button
            className="year-selector__btn"
            onClick={() => jumpToYear(visibleYear + 1)}
            disabled={visibleYear >= MAX_YEAR}
            aria-label="Next year"
          >
            →
          </button>
        </div>
        <div className="header-actions">
          <button
            className="event-list-toggle"
            onClick={() => { setIsEventListOpen(o => !o); setIsMinimapOpen(false); }}
            aria-label="Toggle events panel"
            aria-expanded={isEventListOpen}
          >
            Events
          </button>
          <DataTransfer />
        </div>
        <p className="app-hint app-hint--desktop">Drag to create blocks &nbsp;·&nbsp; Drag blocks to move &nbsp;·&nbsp; Click to edit</p>
        <p className="app-hint app-hint--mobile">Drag to create &nbsp;·&nbsp; Tap to edit</p>
      </header>
      <div ref={sentinelRef} style={{ height: 1 }} aria-hidden="true" />
      <div className="app-content">
        <Minimap range={range} isOpen={isMinimapOpen} onClose={() => setIsMinimapOpen(false)} />
        <YearView
          range={range}
          canExtendPrev={range.start > MIN_YEAR}
          canExtendNext={range.end < MAX_YEAR}
          onNeedPrev={extendPrev}
          onNeedNext={extendNext}
        />
        <EventList isOpen={isEventListOpen} onClose={() => setIsEventListOpen(false)} ensureYear={ensureYear} />
      </div>
      <BlockPopover />
    </>
  );
}

export default function App() {
  return (
    <CalendarProvider>
      <CalendarApp />
    </CalendarProvider>
  );
}
