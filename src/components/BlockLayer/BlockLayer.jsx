import { useEffect, useRef } from 'react';
import { useCalendar } from '../../context/CalendarContext';
import { getBlockSegmentForMonth, getStripsForSegment, getMonthRowCount } from '../../utils/blockUtils';
import Block from '../Block/Block';
import DragPreview from '../DragPreview/DragPreview';
import './BlockLayer.css';

export default function BlockLayer({ year, month, dayCellRef }) {
  const { state } = useCalendar();
  const { blocks, dragState } = state;
  const layerRef = useRef(null);
  const rowCount = getMonthRowCount(year, month);

  // Sync cell height via ResizeObserver
  useEffect(() => {
    if (!dayCellRef?.current || !layerRef.current) return;
    const layer = layerRef.current;
    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      const h = entry.borderBoxSize?.[0]?.blockSize ?? entry.target.getBoundingClientRect().height;
      if (h > 0) layer.style.setProperty('--cell-height', `${h}px`);
    });
    observer.observe(dayCellRef.current);
    // Set initial value
    const h = dayCellRef.current.getBoundingClientRect().height;
    if (h > 0) layer.style.setProperty('--cell-height', `${h}px`);
    return () => observer.disconnect();
  }, [dayCellRef]);

  // Collect all block strips for this month
  const blockStrips = [];
  for (const block of blocks) {
    // During a move or resize drag, use live preview position for the dragged block
    const effectiveBlock =
      ((dragState.mode === 'moving' || dragState.mode === 'resizing') && dragState.blockId === block.id)
        ? { ...block, startDate: dragState.previewStart, endDate: dragState.previewEnd }
        : block;

    const segment = getBlockSegmentForMonth(effectiveBlock, year, month);
    if (!segment) continue;

    const strips = getStripsForSegment(segment.segmentStart, segment.segmentEnd, year, month);
    for (const strip of strips) {
      blockStrips.push({ block, segment, strip });
    }
  }

  // Drag preview strips
  const previewStrips = [];
  if (dragState.mode === 'creating' && dragState.previewStart && dragState.previewEnd) {
    const dummyBlock = { id: '__preview', startDate: dragState.previewStart, endDate: dragState.previewEnd };
    const segment = getBlockSegmentForMonth(dummyBlock, year, month);
    if (segment) {
      const strips = getStripsForSegment(segment.segmentStart, segment.segmentEnd, year, month);
      previewStrips.push(...strips);
    }
  }

  return (
    <div
      ref={layerRef}
      className="block-layer"
      style={{ '--row-count': rowCount }}
    >
      {blockStrips.map(({ block, segment, strip }) => (
        <Block
          key={`${block.id}-r${strip.row}-c${strip.colStart}`}
          block={block}
          strip={strip}
          isClippedLeft={segment.isClippedLeft}
          isClippedRight={segment.isClippedRight}
          isDragging={
            (dragState.mode === 'moving' || dragState.mode === 'resizing') && dragState.blockId === block.id
          }
        />
      ))}
      {previewStrips.map((strip, i) => (
        <DragPreview key={i} strip={strip} />
      ))}
    </div>
  );
}
