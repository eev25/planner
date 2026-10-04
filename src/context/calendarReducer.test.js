import { describe, it, expect } from 'vitest';
import { reducer, initialState } from './calendarReducer';

const ev = (id, overrides = {}) => ({
  id,
  startDate: '2026-03-04',
  endDate: '2026-03-06',
  color: 'sky',
  label: `event ${id}`,
  ...overrides,
});

const withBlocks = (...ids) => ({ ...initialState, blocks: ids.map(id => ev(id)) });

describe('selection', () => {
  it('plain select replaces the selection, and toggles off a sole selection', () => {
    let state = { ...withBlocks('a', 'b'), selectedBlockIds: ['a', 'b'] };
    state = reducer(state, { type: 'SELECT_BLOCK', id: 'a' });
    expect(state.selectedBlockIds).toEqual(['a']);
    state = reducer(state, { type: 'SELECT_BLOCK', id: 'a' });
    expect(state.selectedBlockIds).toEqual([]);
  });

  it('toggle adds and removes one block, keeping the rest', () => {
    let state = reducer(withBlocks('a', 'b', 'c'), { type: 'SELECT_BLOCK', id: 'a' });
    state = reducer(state, { type: 'TOGGLE_BLOCK_SELECTION', id: 'c' });
    expect(state.selectedBlockIds).toEqual(['a', 'c']);
    state = reducer(state, { type: 'TOGGLE_BLOCK_SELECTION', id: 'a' });
    expect(state.selectedBlockIds).toEqual(['c']);
  });

  it('closing the popover deselects only its block', () => {
    let state = reducer(withBlocks('a'), { type: 'POPOVER_OPEN', blockId: 'a' });
    expect(state.selectedBlockIds).toEqual(['a']);
    state = reducer(state, { type: 'POPOVER_CLOSE' });
    expect(state.selectedBlockIds).toEqual([]);
  });
});

describe('BLOCKS_DELETE / UNDO_DELETE', () => {
  it('deletes a batch, drops it from the selection, and remembers it', () => {
    const state = reducer(
      { ...withBlocks('a', 'b', 'c'), selectedBlockIds: ['a', 'b'] },
      { type: 'BLOCKS_DELETE', ids: ['a', 'b'] }
    );
    expect(state.blocks.map(b => b.id)).toEqual(['c']);
    expect(state.selectedBlockIds).toEqual([]);
    expect(state.lastDeleted.blocks.map(b => b.id)).toEqual(['a', 'b']);
  });

  it('closes the popover when its block is deleted', () => {
    let state = reducer(withBlocks('a'), { type: 'POPOVER_OPEN', blockId: 'a' });
    state = reducer(state, { type: 'BLOCKS_DELETE', ids: ['a'] });
    expect(state.popover.visible).toBe(false);
  });

  it('undo restores the whole batch unchanged', () => {
    const before = withBlocks('a', 'b', 'c');
    let state = reducer(before, { type: 'BLOCKS_DELETE', ids: ['a', 'c'] });
    state = reducer(state, { type: 'UNDO_DELETE' });
    expect(state.blocks).toHaveLength(3);
    expect(state.blocks).toEqual(expect.arrayContaining(before.blocks));
    expect(state.lastDeleted).toBe(null);
  });

  it('a new delete replaces the undoable batch', () => {
    let state = reducer(withBlocks('a', 'b'), { type: 'BLOCKS_DELETE', ids: ['a'] });
    state = reducer(state, { type: 'BLOCKS_DELETE', ids: ['b'] });
    state = reducer(state, { type: 'UNDO_DELETE' });
    expect(state.blocks.map(b => b.id)).toEqual(['b']);
  });

  it('nothing to undo after dismissal or an import', () => {
    let state = reducer(withBlocks('a'), { type: 'BLOCKS_DELETE', ids: ['a'] });
    expect(reducer(state, { type: 'DISMISS_UNDO' }).lastDeleted).toBe(null);
    state = reducer(state, { type: 'BLOCKS_IMPORT', blocks: [ev('x')] });
    state = reducer(state, { type: 'UNDO_DELETE' });
    expect(state.blocks.map(b => b.id)).toEqual(['x']);
  });

  it('ignores ids that are not present', () => {
    const state = withBlocks('a');
    expect(reducer(state, { type: 'BLOCKS_DELETE', ids: ['zzz'] })).toBe(state);
  });
});
