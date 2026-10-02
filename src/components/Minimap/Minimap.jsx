import { useRef, useState, useEffect, useLayoutEffect, useMemo } from 'react';
import { useCalendar } from '../../context/CalendarContext';
import { computeLaneStrips, getMonthRowCount } from '../../utils/blockUtils';
import { COLORS } from '../../utils/colorPalette';
import './Minimap.css';

const SVG_WIDTH = 700; // 7 columns × 100 units each
const SVG_DISPLAY_WIDTH = 74; // minimap width (88px) − left padding (8px) − right padding (6px)
const BLOCK_HEIGHT = 16;
const LANE_STEP = 18; // block height + gap, matches .block-strip's lane offset
const MONTH_NAMES = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

// All offsets are relative to the top of .year-view, so they don't change on scroll.
function measureLayout(range) {
  const yearViewEl = document.querySelector('.year-view');
  if (!yearViewEl) return null;

  // Mirrors the .block-strip margin-top breakpoint in Block.css
  const blockTop = window.matchMedia('(max-width: 768px)').matches ? 22 : 26;

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
      const gridRect = gridEl.getBoundingClientRect();
      months.push({
        year,
        month,
        offset: monthRect.top - originTop,
        gridOffset: gridRect.top - originTop,
        cellHeight: gridRect.height / getMonthRowCount(year, month),
        blockTop,
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

  // The labels are HTML positioned over the SVG, so they need its rendered size.
  // It changes with the window height and the mobile drawer, not just the layout.
  const hasLayout = !!layout;
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const measure = () => {
      const border = svg.clientTop;
      const svgRect = svg.getBoundingClientRect();
      const bodyRect = svg.parentElement.getBoundingClientRect();
      setMeasuredSvgHeight(svgRect.height - 2 * border);
      setSvgBodyOffset(svgRect.top - bodyRect.top + border);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(svg);
    return () => ro.disconnect();
  }, [hasLayout]);

  // Track where the viewport sits within .year-view. Scrolling isn't the only thing
  // that moves it: the sticky header shrinking shifts the content without a scroll
  // event, so watch the header too.
  useEffect(() => {
    const update = () => {
      const el = document.querySelector('.year-view');
      if (el) setVpY(-el.getBoundingClientRect().top);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    const headerEl = document.querySelector('.app-header');
    const ro = new ResizeObserver(update);
    // The slim transition animates padding, so only the border box changes
    if (headerEl) ro.observe(headerEl, { box: 'border-box' });
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      ro.disconnect();
    };
  }, [range]);

  // Block rects in .year-view coordinates for every mounted month; the viewBox
  // below decides which slice of them is visible.
  const blockRects = useMemo(() => {
    if (!layout) return [];
    return layout.months.flatMap(md =>
      // Same lane assignment as the calendar, so stacked events land where they do there
      computeLaneStrips(blocks, md.year, md.month).laneStrips.map(({ block, strip, lane }) => {
        const colorDef = COLORS.find(c => c.id === block.color) ?? COLORS[5];
        return (
          <rect
            key={`${block.id}-${md.year}-${md.month}-r${strip.row}-c${strip.colStart}-l${lane}`}
            x={(strip.colStart / 7) * SVG_WIDTH}
            y={md.gridOffset + strip.row * md.cellHeight + md.blockTop + lane * LANE_STEP}
            width={((strip.colEnd - strip.colStart + 1) / 7) * SVG_WIDTH}
            height={BLOCK_HEIGHT}
            fill={colorDef.bg}
            rx={3}
          />
        );
      })
    );
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
  // Labels are clipped by .minimap__body, so keep a margin of off-screen ones mounted
  // and let them slide out smoothly instead of popping at the edge.
  const labelPad = 24 * windowHeight / svgDisplayHeight;
  const inWindow = offset => offset >= winTop - labelPad && offset <= winBottom + labelPad;

  const handleClick = (e) => {
    const yearViewEl = document.querySelector('.year-view');
    if (!yearViewEl || !svgRef.current) return;
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const top = rect.top + svg.clientTop;
    const height = rect.height - 2 * svg.clientTop;
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
          {layout.months.filter(m => inWindow(m.offset)).map(m => (
            <span
              key={`${m.year}-${m.month}`}
              className="minimap__label"
              style={{ top: labelTop(m.offset) }}
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
                style={{ stroke: m.month === 0 ? 'var(--minimap-year-line)' : 'var(--border)' }}
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
