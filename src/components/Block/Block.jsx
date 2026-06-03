import { useCalendar } from '../../context/CalendarContext';
import { COLORS } from '../../utils/colorPalette';
import { daysBetween } from '../../utils/dateUtils';
import './Block.css';

export default function Block({
  block,
  strip,          // { row, colStart, colEnd, isFirstStrip, isLastStrip }
  isClippedLeft,
  isClippedRight,
  isDragging,
}) {
  const { dispatch, state } = useCalendar();
  const colorDef = COLORS.find(c => c.id === block.color) || COLORS[5];
  const isSelected = state.selectedBlockId === block.id;

  function onMouseDown(e) {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();

    // Find the data-date under cursor — use elementFromPoint on a tiny offset
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const dayEl = el?.closest('[data-date]') || el?.parentElement?.closest('[data-date]');
    const clickedDate = dayEl?.dataset?.date || block.startDate;

    const offsetDays = Math.max(0, daysBetween(block.startDate, clickedDate));
    dispatch({
      type: 'DRAG_START_MOVE',
      blockId: block.id,
      offsetDays,
      currentDate: clickedDate,
    });
  }

  function onResizeMouseDown(e, edge) {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const dayEl = el?.closest('[data-date]') || el?.parentElement?.closest('[data-date]');
    const clickedDate = dayEl?.dataset?.date || (edge === 'start' ? block.startDate : block.endDate);
    dispatch({ type: 'DRAG_START_RESIZE', blockId: block.id, resizeEdge: edge, currentDate: clickedDate });
  }

  const showLabel = strip.isFirstStrip && !isClippedLeft;
  const roundLeft  = strip.isFirstStrip && !isClippedLeft;
  const roundRight = strip.isLastStrip  && !isClippedRight;

  const classes = [
    'block-strip',
    roundLeft  ? 'block-strip--round-left'  : '',
    roundRight ? 'block-strip--round-right' : '',
    isClippedLeft  && strip.isFirstStrip ? 'block-strip--arrow-left'  : '',
    isClippedRight && strip.isLastStrip  ? 'block-strip--arrow-right' : '',
    isDragging ? 'block-strip--dragging' : '',
    isSelected && !isDragging ? 'block-strip--selected' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      data-block-id={block.id}
      className={classes}
      style={{
        '--col-start': strip.colStart + 1,
        '--col-end':   strip.colEnd + 2,
        '--row':       strip.row + 1,
        '--bg':        colorDef.bg,
        '--light':     colorDef.light,
      }}
      onMouseDown={onMouseDown}
      title={block.label || 'Click to edit'}
    >
      {strip.isFirstStrip && !isClippedLeft && (
        <div
          className="block-strip__resize-handle block-strip__resize-handle--left"
          onMouseDown={e => onResizeMouseDown(e, 'start')}
        />
      )}
      {showLabel && block.label && (
        <span className="block-strip__label">{block.label}</span>
      )}
      {strip.isLastStrip && !isClippedRight && (
        <div
          className="block-strip__resize-handle block-strip__resize-handle--right"
          onMouseDown={e => onResizeMouseDown(e, 'end')}
        />
      )}
    </div>
  );
}
