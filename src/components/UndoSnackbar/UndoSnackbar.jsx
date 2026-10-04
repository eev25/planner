import { useEffect } from 'react';
import { useCalendar } from '../../context/CalendarContext';
import './UndoSnackbar.css';

const UNDO_MS = 5000;

function message(blocks) {
  if (blocks.length > 1) return `Deleted ${blocks.length} events`;
  return blocks[0].label ? `Deleted “${blocks[0].label}”` : 'Deleted event';
}

// Offers to undo the most recent delete for a few seconds. A new delete
// replaces the message and restarts the timer.
export default function UndoSnackbar() {
  const { state, dispatch } = useCalendar();
  const { lastDeleted } = state;

  useEffect(() => {
    if (!lastDeleted) return;
    const t = setTimeout(() => dispatch({ type: 'DISMISS_UNDO' }), UNDO_MS);
    return () => clearTimeout(t);
  }, [lastDeleted, dispatch]);

  if (!lastDeleted) return null;

  return (
    <div
      key={lastDeleted.blocks.map(b => b.id).join()}
      className="undo-snackbar"
      role="status"
    >
      <span className="undo-snackbar__message">{message(lastDeleted.blocks)}</span>
      <button className="undo-snackbar__undo" onClick={() => dispatch({ type: 'UNDO_DELETE' })}>
        Undo
      </button>
    </div>
  );
}
