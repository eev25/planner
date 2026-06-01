import { forwardRef } from 'react';
import { useCalendar } from '../../context/CalendarContext';
import { todayISO } from '../../utils/dateUtils';
import './DayCell.css';

const TODAY = todayISO();

const DayCell = forwardRef(function DayCell({ dateISO, dayNumber, isEmpty }, ref) {
  const { dispatch, state } = useCalendar();
  const isToday = dateISO === TODAY;
  const isDragging = state.dragState.mode !== 'idle';

  if (isEmpty) {
    return <div className="day-cell day-cell--empty" ref={ref} />;
  }

  function onMouseDown(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    dispatch({ type: 'DRAG_START_CREATE', anchorDate: dateISO });
  }

  return (
    <div
      ref={ref}
      className={`day-cell${isToday ? ' day-cell--today' : ''}${isDragging ? ' day-cell--dragging' : ''}`}
      data-date={dateISO}
      onMouseDown={onMouseDown}
    >
      <span className="day-cell__number">{dayNumber}</span>
    </div>
  );
});

export default DayCell;
