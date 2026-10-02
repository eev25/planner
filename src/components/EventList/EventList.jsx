import { useCalendar } from '../../context/CalendarContext';
import { COLORS } from '../../utils/colorPalette';
import { fromISO, daysBetween } from '../../utils/dateUtils';
import './EventList.css';

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

export default function EventList({ isOpen, onClose, ensureYear }) {
  const { state, dispatch } = useCalendar();
  const { blocks, selectedBlockId } = state;

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

  function handleSelect(block) {
    dispatch({ type: 'SELECT_BLOCK', id: block.id });
    ensureYear(Number(block.startDate.slice(0, 4)), () => {
      requestAnimationFrame(() => {
        document.querySelector(`[data-block-id="${block.id}"]`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
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
        {blocks.length > 0 && (
          <span className="event-list__count">{blocks.length}</span>
        )}
        <button
          className="event-list__close"
          onClick={onClose}
          aria-label="Close events panel"
        >
          ✕
        </button>
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
                {events.map(block => {
                  const colorDef = COLORS.find(c => c.id === block.color) || COLORS[5];
                  const duration = durationLabel(block.startDate, block.endDate);
                  const isSelected = block.id === selectedBlockId;
                  const crossesYear = block.startDate.slice(0, 4) !== block.endDate.slice(0, 4);
                  return (
                    <li
                      key={block.id}
                      className={`event-list__item${isSelected ? ' event-list__item--selected' : ''}`}
                      onClick={() => handleSelect(block)}
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
                    </li>
                  );
                })}
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
