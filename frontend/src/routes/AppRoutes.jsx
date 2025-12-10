import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useRoutes } from 'react-router-dom';
import DashboardPage from '../pages/DashboardPage';
import EditorPage from '../pages/EditorPage';
import HostingSpacePage from '../pages/HostingSpacePage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import { Navigation } from '../components/Navigation';
import { NeonBackground } from '../components/NeonBackground';
import { CommandPalette } from '../components/CommandPalette';

const AppRoutes = () => {
  const [devMode, setDevMode] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const navigate = useNavigate();

  const commands = useMemo(
    () => [
      {
        id: 'domains',
        label: 'Domains dashboard',
        description: 'Overview of active domains, verification, and SSL posture',
        category: 'Navigation',
        action: () => navigate('/')
      },
      {
        id: 'login',
        label: 'Login',
        description: 'Jump to the secure login screen',
        category: 'Account',
        action: () => navigate('/login')
      },
      {
        id: 'register',
        label: 'Register',
        description: 'Create a new operator account with least-privilege defaults',
        category: 'Account',
        action: () => navigate('/register')
      },
      {
        id: 'dev-mode',
        label: devMode ? 'Switch to beginner mode' : 'Switch to dev mode',
        description: 'Toggle advanced telemetry, logs, and automation endpoints',
        badge: devMode ? 'On' : 'Off',
        category: 'Modes',
        action: () => setDevMode((value) => !value)
      }
    ],
    [devMode, navigate]
  );

  useEffect(() => {
    const listener = (event) => {
      const isMac = /mac/i.test(navigator.platform);
      const meta = isMac ? event.metaKey : event.ctrlKey;
      if (meta && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
    };

    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);

  const element = useRoutes([
    { path: '/', element: <DashboardPage devMode={devMode} setDevMode={setDevMode} /> },
    { path: '/hosting/:spaceId', element: <HostingSpacePage /> },
    { path: '/editor/:spaceId', element: <EditorPage devMode={devMode} /> },
    { path: '/login', element: <LoginPage /> },
    { path: '/register', element: <RegisterPage /> }
  ]);

  return (
    <div className="app-shell">
      <NeonBackground />
      <Navigation devMode={devMode} onToggleDevMode={setDevMode} />
      <main>{element}</main>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
    </div>
  );
};

export default AppRoutes;
