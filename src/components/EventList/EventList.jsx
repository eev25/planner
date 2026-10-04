import { useEffect, useState } from 'react';
import { useCalendar } from '../../context/CalendarContext';
import EventRow from './EventRow';
import TrashIcon from './TrashIcon';
import './EventList.css';

export default function EventList({ isOpen, onClose, ensureYear }) {
  const { state, dispatch } = useCalendar();
  const { blocks, selectedBlockIds } = state;
  // The one row whose swipe Delete button is showing, if any.
  const [swipeOpenId, setSwipeOpenId] = useState(null);

  // Clear the highlight as soon as the user presses anywhere else. Presses on
  // list rows (which manage selection themselves), the panel header (its
  // delete button), a highlighted block, or the edit popover keep it.
  // Capture phase, because Block stops propagation.
  useEffect(() => {
    if (selectedBlockIds.length === 0) return;
    function onPointerDown(e) {
      const blockEl = e.target.closest?.('[data-block-id]');
      const keep = e.target.closest?.('.event-list__row, .event-list__header, .popover')
        || selectedBlockIds.includes(blockEl?.dataset.blockId);
      if (!keep) dispatch({ type: 'DESELECT_ALL' });
    }
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [selectedBlockIds, dispatch]);

  // Pressing anywhere outside the swiped-open row closes it.
  useEffect(() => {
    if (!swipeOpenId) return;
    function onPointerDown(e) {
      if (e.target.closest?.('.event-list__row')?.dataset.eventId !== swipeOpenId) {
        setSwipeOpenId(null);
      }
    }
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [swipeOpenId]);

  // Group by start year, then start month. A block that crosses a year boundary
  // is listed once, under the year it starts in.
  const years = [];
  for (const block of [...blocks].sort((a, b) => a.startDate.localeCompare(b.startDate))) {
    const year = Number(block.startDate.slice(0, 4));
    const month = Number(block.startDate.slice(5, 7)) - 1;
    let yearGroup = years.at(-1);
    if (yearGroup?.year !== year) {
      yearGroup = { year, months: [] };
      years.push(yearGroup);
    }
    let monthGroup = yearGroup.months.at(-1);
    if (monthGroup?.month !== month) {
      monthGroup = {
        month,
        name: new Date(year, month, 1).toLocaleString('default', { month: 'long' }),
        events: [],
      };
      yearGroup.months.push(monthGroup);
    }
    monthGroup.events.push(block);
  }

  function handleSelect(block, e) {
    if (e.shiftKey) {
      dispatch({ type: 'TOGGLE_BLOCK_SELECTION', id: block.id });
      return;
    }
    dispatch({ type: 'SELECT_BLOCK', id: block.id });
    ensureYear(Number(block.startDate.slice(0, 4)), () => {
      requestAnimationFrame(() => {
        document.querySelector(`[data-block-id="${block.id}"]`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
    if (onClose) onClose();
  }

  function deleteEvents(ids) {
    dispatch({ type: 'BLOCKS_DELETE', ids });
  }

  const selectedCount = selectedBlockIds.length;
  const deleteLabel = `Delete ${selectedCount} selected event${selectedCount === 1 ? '' : 's'}`;

  return (
    <>
      {isOpen && (
        <div className="event-list__backdrop" onClick={onClose} aria-hidden="true" />
      )}
      <aside className={`event-list${isOpen ? ' event-list--open' : ''}`}>
      <div className="event-list__header">
        <h2 className="event-list__title">Events</h2>
        {selectedCount > 0 ? (
          <span className="event-list__selection">{selectedCount} selected</span>
        ) : blocks.length > 0 && (
          <span className="event-list__count">{blocks.length}</span>
        )}
        <div className="event-list__header-actions">
          {selectedCount > 0 && (
            <button
              className="event-list__delete"
              onClick={() => deleteEvents(selectedBlockIds)}
              aria-label={deleteLabel}
              title={deleteLabel}
            >
              <TrashIcon />
            </button>
          )}
          <button
            className="event-list__close"
            onClick={onClose}
            aria-label="Close events panel"
          >
            ✕
          </button>
        </div>
      </div>
      {years.length === 0 ? (
        <p className="event-list__empty">No events yet. Drag on the calendar to create one.</p>
      ) : (
        <div className="event-list__groups">
          {years.map(({ year, months }) => (
            <div key={year} className="event-list__year-group">
              <h3 className="event-list__year">{year}</h3>
              {months.map(({ month, name, events }) => (
            <div key={month} className="event-list__group">
              <h4 className="event-list__month">{name}</h4>
              <ul className="event-list__items">
                {events.map(block => (
                  <EventRow
                    key={block.id}
                    block={block}
                    isSelected={selectedBlockIds.includes(block.id)}
                    isSwipeOpen={block.id === swipeOpenId}
                    onSwipeOpenChange={setSwipeOpenId}
                    onSelect={handleSelect}
                    onDelete={id => deleteEvents([id])}
                  />
                ))}
              </ul>
            </div>
              ))}
            </div>
          ))}
        </div>
      )}
      </aside>
    </>
  );
}
