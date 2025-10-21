import { Link, useLocation } from 'react-router-dom';

type NavigationProps = {
  devMode: boolean;
  onToggleDevMode: (value: boolean) => void;
};

export const Navigation = ({ devMode, onToggleDevMode }: NavigationProps) => {
  const location = useLocation();

  return (
    <header className="navigation">
      <div className="branding">Alt Production Hosting</div>
      <nav>
        <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
          Dashboard
        </Link>
        <Link to="/login" className={location.pathname === '/login' ? 'active' : ''}>
          Login
        </Link>
        <Link to="/register" className={location.pathname === '/register' ? 'active' : ''}>
          Register
        </Link>
      </nav>
      <label className="dev-mode-toggle">
        <input type="checkbox" checked={devMode} onChange={(event) => onToggleDevMode(event.target.checked)} />
        <span>Dev mode</span>
      </label>
    </header>
  );
};
