import { useCalendar } from '../../context/CalendarContext';
import { COLORS } from '../../utils/colorPalette';
import { fromISO, daysBetween } from '../../utils/dateUtils';
import './EventList.css';

function formatDate(iso) {
  return fromISO(iso).toLocaleDateString('default', { month: 'short', day: 'numeric' });
}

function durationLabel(startISO, endISO) {
  const days = daysBetween(startISO, endISO) + 1;
  return days > 1 ? `${days} days` : null;
}

export default function EventList({ isOpen, onClose }) {
  const { state, dispatch, year } = useCalendar();
  const { blocks, selectedBlockId } = state;

  const yearBlocks = [...blocks]
    .filter(b => b.startDate.startsWith(String(year)))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  const activeMonths = Array.from({ length: 12 }, (_, m) => {
    const prefix = `${year}-${String(m + 1).padStart(2, '0')}`;
    return {
      month: m,
      name: new Date(year, m, 1).toLocaleString('default', { month: 'long' }),
      events: yearBlocks.filter(b => b.startDate.startsWith(prefix)),
    };
  }).filter(m => m.events.length > 0);

  function handleSelect(blockId) {
    dispatch({ type: 'SELECT_BLOCK', id: blockId });
    requestAnimationFrame(() => {
      document.querySelector(`[data-block-id="${blockId}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    if (onClose) onClose();
  }

  return (
    <>
      {isOpen && (
        <div className="event-list__backdrop" onClick={onClose} aria-hidden="true" />
      )}
      <aside className={`event-list${isOpen ? ' event-list--open' : ''}`}>
      <div className="event-list__header">
        <h2 className="event-list__title">Events</h2>
        {yearBlocks.length > 0 && (
          <span className="event-list__count">{yearBlocks.length}</span>
        )}
        <button
          className="event-list__close"
          onClick={onClose}
          aria-label="Close events panel"
        >
          ✕
        </button>
      </div>
      {activeMonths.length === 0 ? (
        <p className="event-list__empty">No events yet. Drag on the calendar to create one.</p>
      ) : (
        <div className="event-list__groups">
          {activeMonths.map(({ month, name, events }) => (
            <div key={month} className="event-list__group">
              <h3 className="event-list__month">{name}</h3>
              <ul className="event-list__items">
                {events.map(block => {
                  const colorDef = COLORS.find(c => c.id === block.color) || COLORS[5];
                  const duration = durationLabel(block.startDate, block.endDate);
                  const isSelected = block.id === selectedBlockId;
                  return (
                    <li
                      key={block.id}
                      className={`event-list__item${isSelected ? ' event-list__item--selected' : ''}`}
                      onClick={() => handleSelect(block.id)}
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
                          {formatDate(block.startDate)}
                          {block.startDate !== block.endDate && ` – ${formatDate(block.endDate)}`}
                          {duration && <span className="event-list__duration">{duration}</span>}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
      </aside>
    </>
  );
}
