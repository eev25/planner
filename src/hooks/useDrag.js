import { useLayoutEffect } from 'react';
import { useCalendar } from '../context/CalendarContext';

export function useDrag() {
  const { state, dispatch } = useCalendar();
  const { dragState } = state;

  useLayoutEffect(() => {
    if (dragState.mode === 'idle') return;

    let hasMoved = false;

    function onPointerMove(e) {
      hasMoved = true;
      // Walk up from point to find a [data-date] element
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const dayEl = el?.closest('[data-date]');
      if (dayEl) {
        dispatch({ type: 'DRAG_UPDATE', currentDate: dayEl.dataset.date });
      }
      // If no dayEl found, keep last known position (no snap-to-nothing)
    }

    function onPointerUp(e) {
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

    function onPointerCancel() {
      dispatch({ type: 'DRAG_CANCEL' });
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        dispatch({ type: 'DRAG_CANCEL' });
      }
    }

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [dragState.mode, dispatch, dragState.blockId]);
}
