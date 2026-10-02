import { useRef, useState, useEffect, useLayoutEffect, useMemo } from 'react';
import { useCalendar } from '../../context/CalendarContext';
import { getBlockSegmentForMonth, getStripsForSegment } from '../../utils/blockUtils';
import { COLORS } from '../../utils/colorPalette';
import './Minimap.css';

const SVG_WIDTH = 700; // 7 columns × 100 units each
const SVG_DISPLAY_WIDTH = 74; // minimap width (88px) − left padding (8px) − right padding (6px)
const CELL_HEIGHT = 84;
const BLOCK_TOP_MARGIN = 26;
const BLOCK_HEIGHT = 16;
const MONTH_NAMES = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const YEAR_LABEL_OFFSET = 16; // pushes the JAN label below the year label above it

// All offsets are relative to the top of .year-view, so they don't change on scroll.
function measureLayout(range) {
  const yearViewEl = document.querySelector('.year-view');
  if (!yearViewEl) return null;

  const originTop = yearViewEl.getBoundingClientRect().top;
  const years = [];
  const months = [];

  for (let year = range.start; year <= range.end; year++) {
    const yearEl = document.getElementById(`year-${year}`);
    if (!yearEl) continue;
    const yearRect = yearEl.getBoundingClientRect();
    years.push({ year, offset: yearRect.top - originTop, height: yearRect.height });

    for (let month = 0; month < 12; month++) {
      const monthEl = document.getElementById(`month-${year}-${month}`);
      const gridEl = monthEl?.querySelector('.month-grid__days-wrapper');
      if (!monthEl || !gridEl) continue;
      const monthRect = monthEl.getBoundingClientRect();
      months.push({
        year,
        month,
        offset: monthRect.top - originTop,
        gridOffset: gridEl.getBoundingClientRect().top - originTop,
        height: monthRect.height,
      });
    }
  }

  return { years, months };
}

export default function Minimap({ range, isOpen, onClose }) {
  const { state: { blocks } } = useCalendar();
  const [vpY, setVpY] = useState(0);
  const [layout, setLayout] = useState(null);
  const [measuredSvgHeight, setMeasuredSvgHeight] = useState(null);
  const [svgBodyOffset, setSvgBodyOffset] = useState(0);
  const svgRef = useRef(null);

  useLayoutEffect(() => {
    setLayout(measureLayout(range));
  }, [range]);

  // Re-measure when the calendar reflows (resize, breakpoint changes, fonts)
  useEffect(() => {
    const yearViewEl = document.querySelector('.year-view');
    if (!yearViewEl) return;
    const ro = new ResizeObserver(() => setLayout(measureLayout(range)));
    ro.observe(yearViewEl);
    return () => ro.disconnect();
  }, [range]);

  useLayoutEffect(() => {
    if (!svgRef.current || !layout) return;
    const bodyEl = svgRef.current.parentElement;
    const svgRect = svgRef.current.getBoundingClientRect();
    const bodyRect = bodyEl.getBoundingClientRect();
    setMeasuredSvgHeight(svgRect.height);
    setSvgBodyOffset(svgRect.top - bodyRect.top);
  }, [layout]);

  useEffect(() => {
    const update = () => {
      const el = document.querySelector('.year-view');
      if (el) setVpY(-el.getBoundingClientRect().top);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [range]);

  // Block rects in .year-view coordinates for every mounted month; the viewBox
  // below decides which slice of them is visible.
  const blockRects = useMemo(() => {
    if (!layout) return [];
    return blocks.flatMap(block => {
      const colorDef = COLORS.find(c => c.id === block.color) ?? COLORS[5];
      return layout.months.flatMap(md => {
        const seg = getBlockSegmentForMonth(block, md.year, md.month);
        if (!seg) return [];
        return getStripsForSegment(seg.segmentStart, seg.segmentEnd, md.year, md.month).map((strip, si) => (
          <rect
            key={`${block.id}-${md.year}-${md.month}-${si}`}
            x={(strip.colStart / 7) * SVG_WIDTH}
            y={md.gridOffset + strip.row * CELL_HEIGHT + BLOCK_TOP_MARGIN}
            width={((strip.colEnd - strip.colStart + 1) / 7) * SVG_WIDTH}
            height={BLOCK_HEIGHT}
            fill={colorDef.bg}
            rx={3}
          />
        ));
      });
    });
  }, [blocks, layout]);

  if (!layout || layout.years.length === 0) {
    return <div className={`minimap${isOpen ? ' minimap--open' : ''}`} />;
  }

  // The map shows roughly one year of calendar (±6 months), centered on the viewport
  const windowHeight = layout.years.reduce((sum, y) => sum + y.height, 0) / layout.years.length;
  const winTop = vpY + window.innerHeight / 2 - windowHeight / 2;
  const winBottom = winTop + windowHeight;

  const headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 52;
  const minimapHeight = window.innerHeight - headerH - 24;
  const svgDisplayHeight = measuredSvgHeight ?? (minimapHeight - 16);
  const svgRx = 6 * SVG_WIDTH / SVG_DISPLAY_WIDTH;
  const svgRy = 6 * windowHeight / svgDisplayHeight;
  const labelTop = offset => svgBodyOffset + ((offset - winTop) / windowHeight) * svgDisplayHeight;
  const inWindow = offset => offset >= winTop && offset <= winBottom - 12 * windowHeight / svgDisplayHeight;

  const handleClick = (e) => {
    const yearViewEl = document.querySelector('.year-view');
    if (!yearViewEl || !svgRef.current) return;
    const { top, height } = svgRef.current.getBoundingClientRect();
    const targetOffset = winTop + ((e.clientY - top) / height) * windowHeight;
    const yearViewDocTop = yearViewEl.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({
      top: Math.max(0, yearViewDocTop + targetOffset - window.innerHeight / 2),
      behavior: 'smooth',
    });
  };

  return (
    <>
      {isOpen && (
        <div className="minimap__backdrop" onClick={onClose} aria-hidden="true" />
      )}
      <div className={`minimap${isOpen ? ' minimap--open' : ''}`}>
        <div className="minimap__body">
          {layout.years.filter(y => inWindow(y.offset)).map(y => (
            <span
              key={`year-${y.year}`}
              className="minimap__label minimap__label--year"
              style={{ top: labelTop(y.offset) }}
            >
              {y.year}
            </span>
          ))}
          {layout.months.filter(m => inWindow(m.offset)).map(m => (
            <span
              key={`${m.year}-${m.month}`}
              className="minimap__label"
              style={{ top: labelTop(m.offset) + (m.month === 0 ? YEAR_LABEL_OFFSET : 0) }}
            >
              {MONTH_NAMES[m.month]}
            </span>
          ))}
          <svg
            ref={svgRef}
            className="minimap__svg"
            viewBox={`0 ${winTop} ${SVG_WIDTH} ${windowHeight}`}
            preserveAspectRatio="none"
            onClick={handleClick}
          >
            {/* Month separator lines; year boundaries are heavier */}
            {layout.months.map((m, i) => i > 0 && (
              <line
                key={`${m.year}-${m.month}`}
                x1={0} y1={m.offset} x2={SVG_WIDTH} y2={m.offset}
                stroke={m.month === 0 ? '#94a3b8' : '#e2e8f0'}
                strokeWidth={m.month === 0 ? 8 : 4}
              />
            ))}

            {blockRects}

            {/* Viewport indicator: pinned to the center of the map */}
            <rect
              x={0}
              y={vpY}
              width={SVG_WIDTH}
              height={window.innerHeight}
              fill="rgba(59,130,246,0.06)"
              stroke="rgba(59,130,246,0.35)"
              strokeWidth={8}
              rx={svgRx} ry={svgRy}
              style={{ pointerEvents: 'none' }}
            />
          </svg>
        </div>
      </div>
    </>
  );
}
