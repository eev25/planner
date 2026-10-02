import { useTheme } from '../../hooks/useTheme';

function Icon({ dark }) {
  return (
    <svg
      className="header-icon-btn__icon"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {dark ? (
        // Currently dark: the sun offers a way back to light.
        <>
          <circle cx="8" cy="8" r="2.8" />
          <path d="M8 1.5v1.4M8 13.1v1.4M1.5 8h1.4M13.1 8h1.4M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1" />
        </>
      ) : (
        <path d="M13.5 9.6A5.7 5.7 0 0 1 6.4 2.5a5.7 5.7 0 1 0 7.1 7.1Z" />
      )}
    </svg>
  );
}

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <button className="header-icon-btn" onClick={toggleTheme} aria-label={label} title={label}>
      <Icon dark={theme === 'dark'} />
      <span className="header-icon-btn__label">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
    </button>
  );
}
