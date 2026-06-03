import { useLayoutEffect } from 'react';
import { useCalendar } from '../context/CalendarContext';

export function useDrag() {
  const { state, dispatch } = useCalendar();
  const { dragState } = state;

  useLayoutEffect(() => {
    if (dragState.mode === 'idle') return;

    let hasMoved = false;

    function onMouseMove(e) {
      hasMoved = true;
      // Walk up from point to find a [data-date] element
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const dayEl = el?.closest('[data-date]');
      if (dayEl) {
        dispatch({ type: 'DRAG_UPDATE', currentDate: dayEl.dataset.date });
      }
      // If no dayEl found, keep last known position (no snap-to-nothing)
    }

    function onMouseUp(e) {
      if (dragState.mode === 'creating') {
        dispatch({ type: 'DRAG_COMMIT_CREATE' });
      } else if (dragState.mode === 'moving') {
        if (!hasMoved) {
          // No movement — treat as a click; open the popover editor
          const blockEl = document.querySelector(`[data-block-id="${dragState.blockId}"]`);
          const rect = blockEl?.getBoundingClientRect();
          dispatch({ type: 'DRAG_CANCEL' });
          if (rect) {
            dispatch({
              type: 'POPOVER_OPEN',
              blockId: dragState.blockId,
              anchorRect: { top: rect.top, left: rect.left, bottom: rect.bottom, right: rect.right, width: rect.width, height: rect.height },
              clickPoint: { x: e.clientX, y: e.clientY },
            });
          }
        } else {
          dispatch({ type: 'DRAG_COMMIT_MOVE' });
        }
      } else if (dragState.mode === 'resizing') {
        dispatch({ type: 'DRAG_COMMIT_RESIZE' });
      }
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        dispatch({ type: 'DRAG_CANCEL' });
      }
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [dragState.mode, dispatch, dragState.blockId]);
}
