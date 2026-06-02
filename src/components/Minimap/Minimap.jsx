import { useRef, useState, useEffect, useLayoutEffect } from 'react';
import { useCalendar } from '../../context/CalendarContext';
import { getBlockSegmentForMonth, getStripsForSegment } from '../../utils/blockUtils';
import { COLORS } from '../../utils/colorPalette';
import './Minimap.css';

const SVG_WIDTH = 700; // 7 columns × 100 units each
const CELL_HEIGHT = 72;
const BLOCK_TOP_MARGIN = 26;
const BLOCK_HEIGHT = 20;
const MONTH_NAMES = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

function measureLayout(year) {
  const yearEl = document.querySelector('.year-view');
  if (!yearEl) return null;

  const yearRect = yearEl.getBoundingClientRect();
  const calendarOffset = yearRect.top + window.scrollY;
  const calendarHeight = yearRect.height;

  const monthData = Array.from({ length: 12 }, (_, m) => {
    const monthEl = document.getElementById(`month-${year}-${m}`);
    const gridEl = monthEl?.querySelector('.month-grid__days-wrapper');
    if (!monthEl || !gridEl) return { offset: 0, gridOffset: 0, height: 0 };

    const monthRect = monthEl.getBoundingClientRect();
    const gridRect = gridEl.getBoundingClientRect();
    return {
      offset: monthRect.top + window.scrollY - calendarOffset,
      gridOffset: gridRect.top + window.scrollY - calendarOffset,
      height: monthRect.height,
    };
  });

  return { calendarOffset, calendarHeight, monthData };
}

export default function Minimap({ year }) {
  const { state: { blocks } } = useCalendar();
  const [scrollY, setScrollY] = useState(() => window.scrollY);
  const [layout, setLayout] = useState(null);
  const svgRef = useRef(null);

  useLayoutEffect(() => {
    setLayout(measureLayout(year));
  }, [year]);

  useEffect(() => {
    const onResize = () => setLayout(measureLayout(year));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [year]);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleClick = (e) => {
    if (!layout || !svgRef.current) return;
    const { top, height } = svgRef.current.getBoundingClientRect();
    const fraction = (e.clientY - top) / height;
    const targetY = layout.calendarOffset + fraction * layout.calendarHeight - window.innerHeight / 2;
    window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
  };

  if (!layout) return <div className="minimap" />;

  const { calendarOffset, calendarHeight, monthData } = layout;
  const vpY = scrollY - calendarOffset;

  const blockRects = blocks.flatMap(block => {
    const rects = [];
    const colorDef = COLORS.find(c => c.id === block.color) ?? COLORS[5];
    for (let m = 0; m < 12; m++) {
      const seg = getBlockSegmentForMonth(block, year, m);
      if (!seg) continue;
      const strips = getStripsForSegment(seg.segmentStart, seg.segmentEnd, year, m);
      strips.forEach((strip, si) => {
        const x = (strip.colStart / 7) * SVG_WIDTH;
        const w = ((strip.colEnd - strip.colStart + 1) / 7) * SVG_WIDTH;
        const y = monthData[m].gridOffset + strip.row * CELL_HEIGHT + BLOCK_TOP_MARGIN;
        rects.push(
          <rect
            key={`${block.id}-${m}-${si}`}
            x={x} y={y} width={w} height={BLOCK_HEIGHT}
            fill={colorDef.bg}
            rx={3}
          />
        );
      });
    }
    return rects;
  });

  const svgDisplayHeight = window.innerHeight - 64; // minimap height (100vh-48) minus 16px padding

  return (
    <div className="minimap">
      {monthData.map((m, i) => (
        <span
          key={i}
          className="minimap__label"
          style={{ top: 8 + (m.offset / calendarHeight) * svgDisplayHeight }}
        >
          {MONTH_NAMES[i]}
        </span>
      ))}
      <svg
        ref={svgRef}
        className="minimap__svg"
        viewBox={`0 0 ${SVG_WIDTH} ${calendarHeight}`}
        preserveAspectRatio="none"
        onClick={handleClick}
      >
        {/* Month separator lines */}
        {monthData.map((m, i) => i > 0 && (
          <line
            key={i}
            x1={0} y1={m.offset} x2={SVG_WIDTH} y2={m.offset}
            stroke="#e2e8f0" strokeWidth={4}
          />
        ))}

        {/* Blocks */}
        {blockRects}

        {/* Viewport indicator */}
        <rect
          x={0}
          y={Math.max(0, vpY)}
          width={SVG_WIDTH}
          height={window.innerHeight}
          fill="rgba(59,130,246,0.06)"
          stroke="rgba(59,130,246,0.35)"
          strokeWidth={8}
          rx={4}
          style={{ pointerEvents: 'none' }}
        />
      </svg>
    </div>
  );
}
