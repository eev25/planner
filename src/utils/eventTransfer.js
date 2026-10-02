import { toISO, fromISO } from './dateUtils';
import { COLORS, DEFAULT_COLOR } from './colorPalette';

const APP_ID = 'calendar-app';
const FORMAT_VERSION = 1;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class ImportError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ImportError';
  }
}

export function serializeEvents(blocks) {
  const events = blocks.map(({ id, startDate, endDate, color, label }) => ({
    id, startDate, endDate, color, label,
  }));
  return JSON.stringify(
    { app: APP_ID, version: FORMAT_VERSION, exportedAt: new Date().toISOString(), events },
    null,
    2
  );
}

function isValidDate(value) {
  return typeof value === 'string' && ISO_DATE.test(value) && toISO(fromISO(value)) === value;
}

function normalizeEvent(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const { id, startDate, endDate, color, label } = raw;
  if (!isValidDate(startDate) || !isValidDate(endDate) || endDate < startDate) return null;
  return {
    id: typeof id === 'string' && id ? id : crypto.randomUUID(),
    startDate,
    endDate,
    color: COLORS.some(c => c.id === color) ? color : DEFAULT_COLOR.id,
    label: typeof label === 'string' ? label : '',
  };
}

/**
 * Parses an exported file (envelope or bare array of events).
 * Throws ImportError for file-level problems; skips and counts invalid events.
 */
export function parseImport(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ImportError('This file is not valid JSON.');
  }

  let rawEvents;
  if (Array.isArray(data)) {
    rawEvents = data;
  } else if (data && typeof data === 'object' && Array.isArray(data.events)) {
    if (typeof data.version === 'number' && data.version > FORMAT_VERSION) {
      throw new ImportError('This file was exported by a newer version of the app and cannot be imported.');
    }
    rawEvents = data.events;
  } else {
    throw new ImportError('This file does not look like a calendar export.');
  }

  const events = [];
  const seen = new Set();
  let invalidCount = 0;
  for (const raw of rawEvents) {
    const event = normalizeEvent(raw);
    if (!event || seen.has(event.id)) {
      invalidCount++;
      continue;
    }
    seen.add(event.id);
    events.push(event);
  }
  return { events, invalidCount };
}

export function findConflicts(existing, incoming) {
  const ids = new Set(existing.map(b => b.id));
  return incoming.filter(e => ids.has(e.id)).length;
}

/**
 * Merges incoming events into existing ones by id. Matching ids are replaced in
 * place when `overwrite` is true, otherwise skipped. New events are appended.
 */
export function mergeEvents(existing, incoming, { overwrite }) {
  const incomingById = new Map(incoming.map(e => [e.id, e]));
  const existingIds = new Set(existing.map(b => b.id));
  let updated = 0;
  let skipped = 0;

  const blocks = existing.map(b => {
    const replacement = incomingById.get(b.id);
    if (!replacement) return b;
    if (overwrite) {
      updated++;
      return replacement;
    }
    skipped++;
    return b;
  });

  const added = incoming.filter(e => !existingIds.has(e.id));
  return { blocks: [...blocks, ...added], added: added.length, updated, skipped };
}
