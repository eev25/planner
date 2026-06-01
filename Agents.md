## What This Is
A frontend-only React + Vite year-planner. Users view all 12 months in a vertical scroll, drag to create color-coded labeled time blocks, and drag blocks to reposition them. No backend; blocks persist via `localStorage`.

**Run:** `npm run dev` → `http://localhost:5173`
**Build:** `npm run build` (requires Node 20.19+ or 22.12+; if on Node 21, Vite 5 is pinned)

## Data Model

```js
// A time block
Block {
  id:        string     // crypto.randomUUID()
  startDate: string     // "YYYY-MM-DD"
  endDate:   string     // "YYYY-MM-DD" (inclusive)
  color:     string     // color id from colorPalette.js (e.g. "sky")
  label:     string     // user-entered text
}

// Top-level reducer state (CalendarContext)
state {
  blocks:    Block[]
  dragState: { mode, anchorDate, currentDate, blockId, offsetDays, previewStart, previewEnd }
  popover:   { visible, blockId, anchorRect }
}
```

Blocks are persisted to `localStorage` under key `calendar-blocks-v1`.
