import { useRef, useState } from 'react';
import { COLORS } from '../../utils/colorPalette';
import { fromISO, daysBetween } from '../../utils/dateUtils';
import TrashIcon from './TrashIcon';

// Swipe-to-delete (touch only). A half swipe leaves the Delete button showing;
// a swipe past FULL_SWIPE_RATIO of the row's width deletes straight away.
const REVEAL_WIDTH = 88;
const FULL_SWIPE_RATIO = 0.6;
const SLOP = 8; // px of travel before deciding between swipe and scroll
const REMOVE_MS = 180; // matches the .event-list__item transform transition

function formatDate(iso, withYear = false) {
  return fromISO(iso).toLocaleDateString('default', {
    month: 'short',
    day: 'numeric',
    ...(withYear && { year: 'numeric' }),
  });
}

function durationLabel(startISO, endISO) {
  const days = daysBetween(startISO, endISO) + 1;
  return days > 1 ? `${days} days` : null;
}

export default function EventRow({ block, isSelected, isSwipeOpen, onSwipeOpenChange, onSelect, onDelete }) {
  const gestureRef = useRef(null);
  const suppressClickRef = useRef(false);
  const [drag, setDrag] = useState(null); // { offset, width } while swiping
  const [isRemoving, setIsRemoving] = useState(false);

  let offset = isSwipeOpen ? -REVEAL_WIDTH : 0;
  if (drag) offset = drag.offset;
  const isArmed = isRemoving || (drag && -drag.offset >= drag.width * FULL_SWIPE_RATIO);

  let transform;
  if (isRemoving) transform = 'translateX(-100%)';
  else if (offset) transform = `translateX(${offset}px)`;

  function remove() {
    setIsRemoving(true);
    onSwipeOpenChange(null);
    setTimeout(() => onDelete(block.id), REMOVE_MS);
  }

  function onPointerDown(e) {
    suppressClickRef.current = false;
    if (e.pointerType !== 'touch' || isRemoving) return;
    gestureRef.current = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startOffset: isSwipeOpen ? -REVEAL_WIDTH : 0,
      width: e.currentTarget.offsetWidth,
      axis: null,
    };
  }

  function onPointerMove(e) {
    const g = gestureRef.current;
    if (!g || e.pointerId !== g.id) return;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    if (!g.axis) {
      if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return;
      if (Math.abs(dy) >= Math.abs(dx)) {
        gestureRef.current = null; // vertical: let the list scroll
        return;
      }
      g.axis = 'x';
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    setDrag({ offset: Math.min(0, Math.max(-g.width, g.startOffset + dx)), width: g.width });
  }

  function onPointerUp(e) {
    const g = gestureRef.current;
    if (!g || e.pointerId !== g.id) return;
    gestureRef.current = null;
    if (!g.axis) return;
    suppressClickRef.current = true;
    const final = drag?.offset ?? g.startOffset;
    setDrag(null);
    if (-final >= g.width * FULL_SWIPE_RATIO) remove();
    else onSwipeOpenChange(-final >= REVEAL_WIDTH / 2 ? block.id : null);
  }

  function onPointerCancel() {
    gestureRef.current = null;
    setDrag(null);
  }

  function onClick(e) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (isSwipeOpen) {
      onSwipeOpenChange(null);
      return;
    }
    onSelect(block, e);
  }

  const colorDef = COLORS.find(c => c.id === block.color) || COLORS[5];
  const duration = durationLabel(block.startDate, block.endDate);
  const crossesYear = block.startDate.slice(0, 4) !== block.endDate.slice(0, 4);

  return (
    <li className="event-list__row" data-event-id={block.id}>
      {(offset < 0 || isRemoving) && (
        <button
          className={`event-list__swipe-delete${isArmed ? ' event-list__swipe-delete--armed' : ''}`}
          style={{ width: isRemoving ? '100%' : Math.max(REVEAL_WIDTH, -offset) }}
          onClick={remove}
        >
          <TrashIcon />
          Delete
        </button>
      )}
      <div
        className={[
          'event-list__item',
          isSelected && 'event-list__item--selected',
          drag && 'event-list__item--dragging',
        ].filter(Boolean).join(' ')}
        style={transform ? { transform } : undefined}
        onClick={onClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <span
          className="event-list__dot"
          style={{ '--dot-color': colorDef.bg }}
        />
        <div className="event-list__info">
          <span className="event-list__label">
            {block.label || <em className="event-list__unlabeled">Unlabeled</em>}
          </span>
          <span className="event-list__dates">
            {formatDate(block.startDate, crossesYear)}
            {block.startDate !== block.endDate && ` – ${formatDate(block.endDate, crossesYear)}`}
            {duration && <span className="event-list__duration">{duration}</span>}
          </span>
        </div>
      </div>
    </li>
  );
}
