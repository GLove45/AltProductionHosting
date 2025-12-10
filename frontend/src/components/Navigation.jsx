import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../contexts/AuthContext';

export const Navigation = ({ devMode, onToggleDevMode }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  return (
    <header className={`navigation ${isMenuOpen ? 'open' : ''}`}>
      <div className="branding" aria-label="Alt Production Hosting">
        <span className="branding-glyph">A</span>
        <div className="branding-copy">
          <span className="branding-text">Alt Production Hosting</span>
          <span className="branding-subtitle">Sovereign domain control</span>
        </div>
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
          Domains
        </Link>
        <a href="#security-stack">Security</a>
        <a href="#analytics">Analytics</a>
        <span className="hotkey-hint desktop-only" aria-label="Command palette">
          ⌘/Ctrl + K
        </span>
        {user ? (
          <>
            <span className="user-pill" aria-label="Logged in user">
              {user.username} ({user.role})
            </span>
            <button type="button" className="link-button" onClick={logout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className={location.pathname === '/login' ? 'active' : ''}>
              Login
            </Link>
            <Link to="/register" className={location.pathname === '/register' ? 'active' : ''}>
              Register
            </Link>
          </>
        )}
        <label className="dev-mode-toggle">
          <input
            type="checkbox"
            checked={devMode}
            onChange={(event) => onToggleDevMode(event.target.checked)}
          />
          <span>Dev mode</span>
        </label>
        <Link to="/" className="cta-pill">
          Start free scan
        </Link>
      </nav>
    </header>
  );
};

Navigation.propTypes = {
  devMode: PropTypes.bool.isRequired,
  onToggleDevMode: PropTypes.func.isRequired
};
