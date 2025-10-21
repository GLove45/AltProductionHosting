import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

type NavigationProps = {
  devMode: boolean;
  onToggleDevMode: (value: boolean) => void;
};

export const Navigation = ({ devMode, onToggleDevMode }: NavigationProps) => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  return (
    <header className={`navigation ${isMenuOpen ? 'open' : ''}`}>
      <div className="branding" aria-label="Alt Production Hosting">
        <span className="branding-text">ALT PRODUCTION</span>
        <span className="branding-subtitle">hosting intelligence</span>
      </div>

      <button
        type="button"
        className="navigation-toggle"
        aria-expanded={isMenuOpen}
        onClick={() => setIsMenuOpen((value) => !value)}
      >
        <span className="sr-only">Toggle navigation menu</span>
        <span className="toggle-bar" />
        <span className="toggle-bar" />
        <span className="toggle-bar" />
      </button>

      <nav className="navigation-links">
        <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
          Dashboard
        </Link>
        <Link to="/login" className={location.pathname === '/login' ? 'active' : ''}>
          Login
        </Link>
        <Link to="/register" className={location.pathname === '/register' ? 'active' : ''}>
          Register
        </Link>
        <label className="dev-mode-toggle">
          <input
            type="checkbox"
            checked={devMode}
            onChange={(event) => onToggleDevMode(event.target.checked)}
          />
          <span>Dev mode</span>
        </label>
      </nav>
    </header>
  );
};
