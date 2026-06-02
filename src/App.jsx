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
const TITLE_STORAGE_KEY = 'calendar-title';

function CalendarApp({ year, setYear }) {
  const [title, setTitle] = useState(
    () => localStorage.getItem(TITLE_STORAGE_KEY) ?? String(BASE_YEAR)
  );
  const [isEditing, setIsEditing] = useState(false);

  function commitTitle(value) {
    const next = value.trim() || String(BASE_YEAR);
    setTitle(next);
    localStorage.setItem(TITLE_STORAGE_KEY, next);
    setIsEditing(false);
  }

  const sentinelRef = useRef(null);
  const [isSlim, setIsSlim] = useState(false);

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

  useDrag(); // registers global mouse event listeners
  return (
    <>
      <header className={`app-header${isSlim ? ' app-header--slim' : ''}`}>
        {isEditing ? (
          <input
            className="app-title app-title--editing"
            defaultValue={title}
            autoFocus
            onBlur={e => commitTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') e.target.blur();
              if (e.key === 'Escape') setIsEditing(false);
            }}
          />
        ) : (
          <h1
            className="app-title app-title--clickable"
            onClick={() => setIsEditing(true)}
            title="Click to edit"
          >
            {title}
          </h1>
        )}
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
        <p className="app-hint">Drag to create blocks &nbsp;·&nbsp; Drag blocks to move &nbsp;·&nbsp; Click to edit &nbsp;·&nbsp; Right-click to delete</p>
      </header>
      <div ref={sentinelRef} style={{ height: 1 }} aria-hidden="true" />
      <div className="app-content">
        <Minimap year={year} />
        <YearView year={year} />
        <EventList />
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
