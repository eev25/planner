import { describe, it, expect } from 'vitest';
import { serializeEvents, parseImport, findConflicts, mergeEvents, ImportError } from './eventTransfer';

const ev = (id, overrides = {}) => ({
  id,
  startDate: '2026-03-04',
  endDate: '2026-03-06',
  color: 'sky',
  label: `event ${id}`,
  ...overrides,
});

describe('serializeEvents / parseImport', () => {
  it('round-trips events', () => {
    const blocks = [ev('a'), ev('b', { color: 'rose', label: '' })];
    const { events, invalidCount } = parseImport(serializeEvents(blocks));
    expect(events).toEqual(blocks);
    expect(invalidCount).toBe(0);
  });

  it('writes the versioned envelope and only known fields', () => {
    const data = JSON.parse(serializeEvents([{ ...ev('a'), extra: 'nope' }]));
    expect(data.app).toBe('calendar-app');
    expect(data.version).toBe(1);
    expect(typeof data.exportedAt).toBe('string');
    expect(data.events[0]).not.toHaveProperty('extra');
  });

  it('accepts a bare array', () => {
    const { events } = parseImport(JSON.stringify([ev('a')]));
    expect(events).toEqual([ev('a')]);
  });

  it('throws ImportError for invalid JSON', () => {
    expect(() => parseImport('not json')).toThrow(ImportError);
  });

  it('throws ImportError for the wrong shape', () => {
    expect(() => parseImport('{"foo": 1}')).toThrow(ImportError);
    expect(() => parseImport('42')).toThrow(ImportError);
    expect(() => parseImport('null')).toThrow(ImportError);
  });

  it('throws ImportError for a newer version', () => {
    expect(() => parseImport(JSON.stringify({ version: 2, events: [] }))).toThrow(ImportError);
  });

  it('counts events with bad or impossible dates, or end before start, as invalid', () => {
    const text = JSON.stringify([
      ev('ok'),
      ev('bad-format', { startDate: '2026/03/04' }),
      ev('impossible', { startDate: '2026-02-31', endDate: '2026-03-01' }),
      ev('reversed', { startDate: '2026-03-06', endDate: '2026-03-04' }),
      ev('missing', { endDate: undefined }),
      null,
      'string',
    ]);
    const { events, invalidCount } = parseImport(text);
    expect(events.map(e => e.id)).toEqual(['ok']);
    expect(invalidCount).toBe(6);
  });

  it('falls back to the default color for unknown colors', () => {
    const { events } = parseImport(JSON.stringify([ev('a', { color: 'chartreuse' })]));
    expect(events[0].color).toBe('sky');
  });

  it('defaults a non-string label to an empty string', () => {
    const { events } = parseImport(JSON.stringify([ev('a', { label: 5 })]));
    expect(events[0].label).toBe('');
  });

  it('generates an id when missing', () => {
    const { events } = parseImport(JSON.stringify([ev('x', { id: undefined })]));
    expect(typeof events[0].id).toBe('string');
    expect(events[0].id.length).toBeGreaterThan(0);
  });

  it('keeps the first of duplicate ids and counts the rest as invalid', () => {
    const { events, invalidCount } = parseImport(
      JSON.stringify([ev('a', { label: 'first' }), ev('a', { label: 'second' })])
    );
    expect(events).toHaveLength(1);
    expect(events[0].label).toBe('first');
    expect(invalidCount).toBe(1);
  });
});

describe('findConflicts', () => {
  it('counts incoming ids that already exist', () => {
    expect(findConflicts([ev('a'), ev('b')], [ev('b'), ev('c')])).toBe(1);
    expect(findConflicts([], [ev('a')])).toBe(0);
  });
});

describe('mergeEvents', () => {
  const existing = [ev('a', { label: 'local' }), ev('b')];
  const incoming = [ev('a', { label: 'imported' }), ev('c')];

  it('overwrites matching ids in place and appends new ones', () => {
    const result = mergeEvents(existing, incoming, { overwrite: true });
    expect(result.blocks.map(b => b.id)).toEqual(['a', 'b', 'c']);
    expect(result.blocks[0].label).toBe('imported');
    expect(result).toMatchObject({ added: 1, updated: 1, skipped: 0 });
  });

  it('keeps existing events on id match when overwrite is off', () => {
    const result = mergeEvents(existing, incoming, { overwrite: false });
    expect(result.blocks.map(b => b.id)).toEqual(['a', 'b', 'c']);
    expect(result.blocks[0].label).toBe('local');
    expect(result).toMatchObject({ added: 1, updated: 0, skipped: 1 });
  });

  it('is a no-op when re-importing with overwrite off', () => {
    const result = mergeEvents(existing, existing, { overwrite: false });
    expect(result.blocks).toEqual(existing);
    expect(result.added).toBe(0);
  });
});
