import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useCalendar } from '../../context/CalendarContext';
import { COLORS } from '../../utils/colorPalette';
import './BlockPopover.css';

export default function BlockPopover() {
  const { state, dispatch } = useCalendar();
  const { popover, blocks } = state;
  const inputRef = useRef(null);

  const block = blocks.find(b => b.id === popover.blockId);

  const [label, setLabel]   = useState('');
  const [color, setColor]   = useState('sky');

  // Sync local state when popover opens
  useEffect(() => {
    if (popover.visible && block) {
      setLabel(block.label || '');
      setColor(block.color || 'sky');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [popover.visible, popover.blockId]);

  if (!popover.visible || !block) return null;

  function save() {
    dispatch({ type: 'BLOCK_UPDATE', id: block.id, label, color });
    dispatch({ type: 'POPOVER_CLOSE' });
  }

  function onKeyDown(e) {
    if (e.key === 'Enter') save();
    if (e.key === 'Escape') dispatch({ type: 'POPOVER_CLOSE' });
  }

  function onOverlayClick(e) {
    if (e.target === e.currentTarget) {
      save(); // save on click-outside
    }
  }

  const style = {};
  if (popover.anchorRect) {
    const r = popover.anchorRect;
    // Position below the block; flip up if near bottom
    const spaceBelow = window.innerHeight - r.bottom;
    if (spaceBelow > 180) {
      style.top  = r.bottom + window.scrollY + 8;
      style.left = Math.min(r.left + window.scrollX, window.innerWidth - 260);
    } else {
      style.top  = r.top + window.scrollY - 180;
      style.left = Math.min(r.left + window.scrollX, window.innerWidth - 260);
    }
  } else {
    style.top  = '50%';
    style.left = '50%';
    style.transform = 'translate(-50%, -50%)';
  }

  return createPortal(
    <div className="popover-overlay" onMouseDown={onOverlayClick}>
      <div className="popover" style={style} onMouseDown={e => e.stopPropagation()}>
        <div className="popover__header">
          <span>Edit block</span>
          <button className="popover__close" onClick={() => dispatch({ type: 'POPOVER_CLOSE' })}>✕</button>
        </div>
        <input
          ref={inputRef}
          className="popover__input"
          placeholder="Add a label..."
          value={label}
          onChange={e => setLabel(e.target.value)}
          onKeyDown={onKeyDown}
          maxLength={40}
        />
        <div className="popover__colors">
          {COLORS.map(c => (
            <button
              key={c.id}
              className={`color-swatch${color === c.id ? ' color-swatch--selected' : ''}`}
              style={{ '--swatch-bg': c.bg }}
              onClick={() => setColor(c.id)}
              title={c.label}
            />
          ))}
        </div>
        <div className="popover__actions">
          <button className="popover__btn popover__btn--delete" onClick={() => {
            dispatch({ type: 'BLOCK_DELETE', id: block.id });
            dispatch({ type: 'POPOVER_CLOSE' });
          }}>Delete</button>
          <button className="popover__btn popover__btn--save" onClick={save}>Save</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
