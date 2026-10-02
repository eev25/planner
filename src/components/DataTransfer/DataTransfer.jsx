import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useCalendar } from '../../context/CalendarContext';
import { todayISO } from '../../utils/dateUtils';
import {
  serializeEvents,
  parseImport,
  findConflicts,
  mergeEvents,
  ImportError,
} from '../../utils/eventTransfer';
import './DataTransfer.css';

const TOAST_MS = 4000;

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export default function DataTransfer() {
  const { state, dispatch } = useCalendar();
  const fileInputRef = useRef(null);
  // null | { fileName, events, invalidCount, conflicts } | { error }
  const [pending, setPending] = useState(null);
  const [overwrite, setOverwrite] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!pending) return;
    const onKey = (e) => { if (e.key === 'Escape') setPending(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending]);

  function handleExport() {
    const blob = new Blob([serializeEvents(state.blocks)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calendar-events-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function handleFileChosen(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow choosing the same file again
    if (!file) return;
    try {
      const { events, invalidCount } = parseImport(await file.text());
      setOverwrite(true);
      setPending({
        fileName: file.name,
        events,
        invalidCount,
        conflicts: findConflicts(state.blocks, events),
      });
    } catch (err) {
      setPending({
        error: err instanceof ImportError ? err.message : 'The file could not be read.',
      });
    }
  }

  function handleConfirm() {
    const result = mergeEvents(state.blocks, pending.events, { overwrite });
    dispatch({ type: 'BLOCKS_IMPORT', blocks: result.blocks });
    const parts = [];
    if (result.updated) parts.push(`${result.updated} updated`);
    if (result.skipped) parts.push(`${result.skipped} skipped`);
    setToast(
      `Imported ${plural(result.added, 'new event')}` + (parts.length ? ` (${parts.join(', ')})` : '')
    );
    setPending(null);
  }

  const canImport = pending && !pending.error && pending.events.length > 0;

  return (
    <>
      <button
        className="data-transfer__btn"
        onClick={handleExport}
        disabled={state.blocks.length === 0}
        aria-label="Export events"
        title="Export events"
      >
        <span className="data-transfer__icon" aria-hidden="true">↓</span>
        <span className="data-transfer__text">Export</span>
      </button>
      <button
        className="data-transfer__btn"
        onClick={() => fileInputRef.current?.click()}
        aria-label="Import events"
        title="Import events"
      >
        <span className="data-transfer__icon" aria-hidden="true">↑</span>
        <span className="data-transfer__text">Import</span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileChosen}
        hidden
      />

      {/* Portaled: the header is sticky/transformed, which would trap position:fixed. */}
      {pending && createPortal(
        <div className="data-transfer__backdrop" onClick={() => setPending(null)}>
          <div
            className="data-transfer__dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Import events"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="data-transfer__title">Import events</h2>
            {pending.error ? (
              <p className="data-transfer__message data-transfer__message--error">{pending.error}</p>
            ) : pending.events.length === 0 ? (
              <p className="data-transfer__message">
                No valid events found in <strong>{pending.fileName}</strong>.
                {pending.invalidCount > 0 && ` ${plural(pending.invalidCount, 'entry')} could not be read.`}
              </p>
            ) : (
              <>
                <p className="data-transfer__message">
                  Import <strong>{plural(pending.events.length, 'event')}</strong> from{' '}
                  <strong>{pending.fileName}</strong>? Your existing events are kept.
                </p>
                {pending.invalidCount > 0 && (
                  <p className="data-transfer__note">
                    {plural(pending.invalidCount, 'invalid entry')} will be skipped.
                  </p>
                )}
                {pending.conflicts > 0 && (
                  <label className="data-transfer__check">
                    <input
                      type="checkbox"
                      checked={overwrite}
                      onChange={e => setOverwrite(e.target.checked)}
                    />
                    Overwrite {plural(pending.conflicts, 'existing event')} with the imported version
                  </label>
                )}
              </>
            )}
            <div className="data-transfer__actions">
              <button className="data-transfer__action" onClick={() => setPending(null)}>
                {canImport ? 'Cancel' : 'Close'}
              </button>
              {canImport && (
                <button
                  className="data-transfer__action data-transfer__action--primary"
                  onClick={handleConfirm}
                  autoFocus
                >
                  Import
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {toast && createPortal(
        <div className="data-transfer__toast" role="status">{toast}</div>,
        document.body
      )}
    </>
  );
}
