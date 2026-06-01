import MonthGrid from '../MonthGrid/MonthGrid';
import './YearView.css';

export default function YearView({ year }) {
  return (
    <div className="year-view">
      {Array.from({ length: 12 }, (_, i) => (
        <MonthGrid key={i} year={year} month={i} />
      ))}
    </div>
  );
}
