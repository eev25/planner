import './DragPreview.css';

export default function DragPreview({ strip }) {
  return (
    <div
      className="drag-preview"
      style={{
        '--col-start': strip.colStart + 1,
        '--col-end':   strip.colEnd + 2,
        '--row':       strip.row + 1,
      }}
    />
  );
}
