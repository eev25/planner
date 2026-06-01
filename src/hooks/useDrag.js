import { useEffect } from 'react';
import { useCalendar } from '../context/CalendarContext';

export function useDrag() {
  const { state, dispatch } = useCalendar();
  const { dragState } = state;

  useEffect(() => {
    if (dragState.mode === 'idle') return;

    function onMouseMove(e) {
      // Walk up from point to find a [data-date] element
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const dayEl = el?.closest('[data-date]');
      if (dayEl) {
        dispatch({ type: 'DRAG_UPDATE', currentDate: dayEl.dataset.date });
      }
      // If no dayEl found, keep last known position (no snap-to-nothing)
    }

    function onMouseUp() {
      if (dragState.mode === 'creating') {
        dispatch({ type: 'DRAG_COMMIT_CREATE' });
      } else if (dragState.mode === 'moving') {
        dispatch({ type: 'DRAG_COMMIT_MOVE' });
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
  }, [dragState.mode, dispatch]);
}
