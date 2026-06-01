import { useRef } from 'react';
import { getDaysInMonth, getFirstDayOfWeek, toISO, formatMonthYear } from '../../utils/dateUtils';
import DayCell from '../DayCell/DayCell';
import BlockLayer from '../BlockLayer/BlockLayer';
import './MonthGrid.css';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function MonthGrid({ year, month }) {
  const firstDayCellRef = useRef(null);
  const firstDow  = getFirstDayOfWeek(year, month);
  const daysCount = getDaysInMonth(year, month);

  // Build cells: leading empties + days
  const cells = [];
  for (let i = 0; i < firstDow; i++) {
    cells.push({ isEmpty: true, key: `empty-${i}` });
  }
  for (let d = 1; d <= daysCount; d++) {
    cells.push({
      isEmpty: false,
      dayNumber: d,
      dateISO: toISO(new Date(year, month, d)),
      key: `day-${d}`,
      isFirst: d === 1,
    });
  }

  return (
    <div className="month-grid" id={`month-${year}-${month}`}>
      <h2 className="month-grid__title">{formatMonthYear(year, month)}</h2>
      <div className="month-grid__weekdays">
        {WEEKDAYS.map(d => <div key={d} className="month-grid__weekday">{d}</div>)}
      </div>
      <div className="month-grid__days-wrapper">
        <div className="month-grid__days">
          {cells.map((cell, idx) =>
            cell.isEmpty ? (
              <DayCell key={cell.key} isEmpty />
            ) : (
              <DayCell
                key={cell.key}
                ref={cell.isFirst ? firstDayCellRef : undefined}
                dateISO={cell.dateISO}
                dayNumber={cell.dayNumber}
                isEmpty={false}
              />
            )
          )}
        </div>
        <BlockLayer year={year} month={month} dayCellRef={firstDayCellRef} />
      </div>
    </div>
  );
}
