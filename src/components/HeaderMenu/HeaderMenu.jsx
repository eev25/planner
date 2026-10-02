import { useState, useEffect, useRef } from 'react';
import './HeaderMenu.css';

// On desktop the children sit inline as icon buttons. On mobile there isn't room
// for them next to Map/Events, so the same buttons collapse into a dropdown behind
// a "more" button (see HeaderMenu.css).
export default function HeaderMenu({ children }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="header-menu">
      <button
        className="header-icon-btn header-menu__toggle"
        onClick={() => setOpen(o => !o)}
        aria-label="More actions"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
          <circle cx="3" cy="8" r="1.4" />
          <circle cx="8" cy="8" r="1.4" />
          <circle cx="13" cy="8" r="1.4" />
        </svg>
      </button>
      <div
        className={`header-menu__items${open ? ' header-menu__items--open' : ''}`}
        onClick={() => setOpen(false)}
      >
        {children}
      </div>
    </div>
  );
}
