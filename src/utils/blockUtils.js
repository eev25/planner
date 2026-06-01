import { fromISO, minDate, maxDate, monthStartISO, monthEndISO, getDaysInMonth, getFirstDayOfWeek } from './dateUtils';

/**
 * Returns the visible segment of a block within a given month, or null if no overlap.
 */
export function getBlockSegmentForMonth(block, year, month) {
  const mStart = monthStartISO(year, month);
  const mEnd   = monthEndISO(year, month);

  if (block.endDate < mStart || block.startDate > mEnd) return null;

  const segmentStart = maxDate(block.startDate, mStart);
  const segmentEnd   = minDate(block.endDate,   mEnd);

  return {
    segmentStart,
    segmentEnd,
    isClippedLeft:  block.startDate < mStart,
    isClippedRight: block.endDate   > mEnd,
    block,
  };
}

/**
 * Given a segment within a month, returns an array of per-week-row strips.
 * Each strip: { row, colStart (0-6), colEnd (0-6), isFirstStrip, isLastStrip }
 */
export function getStripsForSegment(segmentStart, segmentEnd, year, month) {
  const firstDow   = getFirstDayOfWeek(year, month); // 0=Sun offset
  const startDay   = fromISO(segmentStart).getDate(); // 1-based
  const endDay     = fromISO(segmentEnd).getDate();

  const startCell  = firstDow + startDay - 1; // 0-indexed cell in the grid
  const endCell    = firstDow + endDay   - 1;

  const startRow   = Math.floor(startCell / 7);
  const endRow     = Math.floor(endCell   / 7);

  const strips = [];
  for (let row = startRow; row <= endRow; row++) {
    const colStart = row === startRow ? startCell % 7 : 0;
    const colEnd   = row === endRow   ? endCell   % 7 : 6;
    strips.push({
      row,
      colStart,
      colEnd,
      isFirstStrip: row === startRow,
      isLastStrip:  row === endRow,
    });
  }
  return strips;
}

/**
 * Returns the number of grid rows needed for a month (4, 5, or 6).
 */
export function getMonthRowCount(year, month) {
  const firstDow = getFirstDayOfWeek(year, month);
  const days     = getDaysInMonth(year, month);
  return Math.ceil((firstDow + days) / 7);
}
