import { useState, useEffect } from 'react';
import './TodayButton.css';

// Floating pill shown only while today's cell is scrolled out of view; the arrow
// points toward it.
export default function TodayButton({ onClick }) {
  const [direction, setDirection] = useState(null); // null | 'up' | 'down'

  useEffect(() => {
    let raf = 0;
    const compute = () => {
      raf = 0;
      const cell = document.querySelector('.day-cell--today');
      const header = document.querySelector('.app-header');
      if (!cell || !header) {
        setDirection(null);
        return;
      }
      const { top, bottom } = cell.getBoundingClientRect();
      const headerBottom = header.getBoundingClientRect().bottom;
      setDirection(bottom <= headerBottom ? 'up' : top >= window.innerHeight ? 'down' : null);
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(compute); };
    compute();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  if (!direction) return null;

  return (
    <button className="today-button" onClick={onClick} aria-label="Scroll to today">
      <span aria-hidden="true">{direction === 'up' ? '↑' : '↓'}</span> Today
    </button>
  );
}
