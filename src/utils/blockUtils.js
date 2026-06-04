import { fromISO, minDate, maxDate, monthStartISO, monthEndISO, getDaysInMonth, getFirstDayOfWeek, daysBetween } from './dateUtils';

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
 * Assigns lanes (0-2) to block strips for a month, handling overlaps.
 * Returns laneStrips (strips to render) and overflowBadges (+N indicators).
 * Expects effectiveBlocks with any drag-preview substitution already applied.
 */
export function computeLaneStrips(effectiveBlocks, year, month) {
  // Step 1: Collect all base strips with duration
  const allEntries = [];
  for (const block of effectiveBlocks) {
    const segment = getBlockSegmentForMonth(block, year, month);
    if (!segment) continue;
    const duration = daysBetween(block.startDate, block.endDate) + 1;
    const strips = getStripsForSegment(segment.segmentStart, segment.segmentEnd, year, month);
    for (const strip of strips) {
      allEntries.push({ block, strip, duration, isClippedLeft: segment.isClippedLeft, isClippedRight: segment.isClippedRight });
    }
  }

  // Group by row
  const rowMap = new Map();
  for (const entry of allEntries) {
    const r = entry.strip.row;
    if (!rowMap.has(r)) rowMap.set(r, []);
    rowMap.get(r).push(entry);
  }

  const laneMap = new Map(); // `${blockId}_${row}` -> lane (0|1|2) or -1 for overflow
  const colCount = new Map(); // `${row}_${col}` -> total strips passing through

  for (const [row, entries] of rowMap) {
    // Count all events per column
    for (const { strip } of entries) {
      for (let c = strip.colStart; c <= strip.colEnd; c++) {
        const key = `${row}_${c}`;
        colCount.set(key, (colCount.get(key) || 0) + 1);
      }
    }

    // Sort by duration DESC, startDate ASC for determinism
    entries.sort((a, b) =>
      b.duration - a.duration || a.block.startDate.localeCompare(b.block.startDate)
    );

    // Greedy interval graph coloring: assign lanes 0, 1, 2
    const assigned = []; // {colStart, colEnd, lane}
    for (const entry of entries) {
      const { colStart, colEnd } = entry.strip;
      const usedLanes = new Set();
      for (const a of assigned) {
        if (a.colEnd >= colStart && a.colStart <= colEnd) usedLanes.add(a.lane);
      }
      let lane = -1;
      for (let l = 0; l < 3; l++) {
        if (!usedLanes.has(l)) { lane = l; break; }
      }
      laneMap.set(`${entry.block.id}_${row}`, lane);
      if (lane >= 0) assigned.push({ colStart, colEnd, lane });
    }
  }

  // Step 2: Build lane-strips, splitting lane-2 strips at overflow columns
  const laneStrips = [];
  for (const entry of allEntries) {
    const { block, strip, isClippedLeft, isClippedRight } = entry;
    const lane = laneMap.get(`${block.id}_${strip.row}`) ?? -1;
    if (lane === -1) continue;

    if (lane < 2) {
      // Lanes 0 and 1 always render in full
      laneStrips.push({ block, strip, lane, isClippedLeft, isClippedRight });
      continue;
    }

    // Lane 2: split at overflow columns (colCount > 3), iterating column by column
    const { row, colStart, colEnd, isFirstStrip, isLastStrip } = strip;
    let subStart = null;

    const flushSub = (subEnd) => {
      if (subStart === null) return;
      const iFirst = isFirstStrip && subStart === colStart;
      const iLast  = isLastStrip  && subEnd   === colEnd;
      laneStrips.push({
        block,
        strip: { row, colStart: subStart, colEnd: subEnd, isFirstStrip: iFirst, isLastStrip: iLast },
        lane: 2,
        isClippedLeft:  iFirst && isClippedLeft,
        isClippedRight: iLast  && isClippedRight,
      });
      subStart = null;
    };

    for (let c = colStart; c <= colEnd; c++) {
      if ((colCount.get(`${row}_${c}`) || 0) > 3) {
        flushSub(c - 1);
      } else {
        if (subStart === null) subStart = c;
      }
    }
    flushSub(colEnd);
  }

  // Step 3: Emit overflow badges for each column with colCount > 3
  const overflowBadges = [];
  const seen = new Set();
  for (const [key, count] of colCount) {
    if (count > 3 && !seen.has(key)) {
      seen.add(key);
      const [row, col] = key.split('_').map(Number);
      overflowBadges.push({ row, col, count: count - 2 });
    }
  }

  return { laneStrips, overflowBadges };
}

/**
 * Returns the number of grid rows needed for a month (4, 5, or 6).
 */
export function getMonthRowCount(year, month) {
  const firstDow = getFirstDayOfWeek(year, month);
  const days     = getDaysInMonth(year, month);
  return Math.ceil((firstDow + days) / 7);
}
