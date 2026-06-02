import { CalendarProvider } from './context/CalendarContext';
import { useDrag } from './hooks/useDrag';
import YearView from './components/YearView/YearView';
import BlockPopover from './components/BlockPopover/BlockPopover';
import EventList from './components/EventList/EventList';
import Minimap from './components/Minimap/Minimap';
import './App.css';

const YEAR = new Date().getFullYear();

function CalendarApp() {
  useDrag(); // registers global mouse event listeners
  return (
    <>
      <header className="app-header">
        <h1 className="app-title">{YEAR}</h1>
        <p className="app-hint">Drag to create blocks &nbsp;·&nbsp; Drag blocks to move &nbsp;·&nbsp; Click to edit &nbsp;·&nbsp; Right-click to delete</p>
      </header>
      <div className="app-content">
        <Minimap year={YEAR} />
        <YearView year={YEAR} />
        <EventList />
      </div>
      <BlockPopover />
    </>
  );
}

export default function App() {
  return (
    <CalendarProvider year={YEAR}>
      <CalendarApp />
    </CalendarProvider>
  );
}
