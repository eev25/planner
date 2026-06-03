import { useState, useEffect, useRef } from 'react';
import { CalendarProvider } from './context/CalendarContext';
import { useDrag } from './hooks/useDrag';
import YearView from './components/YearView/YearView';
import BlockPopover from './components/BlockPopover/BlockPopover';
import EventList from './components/EventList/EventList';
import Minimap from './components/Minimap/Minimap';
import './App.css';

const BASE_YEAR = new Date().getFullYear();
const MAX_YEAR = BASE_YEAR + 5;

function CalendarApp({ year, setYear }) {
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
            onClick={() => setYear(y => y - 1)}
            disabled={year <= BASE_YEAR}
            aria-label="Previous year"
          >
            ←
          </button>
          <span className="year-selector__label">{year}</span>
          <button
            className="year-selector__btn"
            onClick={() => setYear(y => y + 1)}
            disabled={year >= MAX_YEAR}
            aria-label="Next year"
          >
            →
          </button>
        </div>
        <button
          className="event-list-toggle"
          onClick={() => { setIsEventListOpen(o => !o); setIsMinimapOpen(false); }}
          aria-label="Toggle events panel"
          aria-expanded={isEventListOpen}
        >
          Events
        </button>
        <p className="app-hint app-hint--desktop">Drag to create blocks &nbsp;·&nbsp; Drag blocks to move &nbsp;·&nbsp; Click to edit</p>
        <p className="app-hint app-hint--mobile">Drag to create &nbsp;·&nbsp; Tap to edit</p>
      </header>
      <div ref={sentinelRef} style={{ height: 1 }} aria-hidden="true" />
      <div className="app-content">
        <Minimap year={year} isOpen={isMinimapOpen} onClose={() => setIsMinimapOpen(false)} />
        <YearView year={year} />
        <EventList isOpen={isEventListOpen} onClose={() => setIsEventListOpen(false)} />
      </div>
      <BlockPopover />
    </>
  );
}

export default function App() {
  const [year, setYear] = useState(BASE_YEAR);
  return (
    <CalendarProvider year={year}>
      <CalendarApp year={year} setYear={setYear} />
    </CalendarProvider>
  );
}
