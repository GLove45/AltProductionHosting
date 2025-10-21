import { useState } from 'react';
import { useRoutes } from 'react-router-dom';
import DashboardPage from '../pages/DashboardPage';
import EditorPage from '../pages/EditorPage';
import HostingSpacePage from '../pages/HostingSpacePage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import { Navigation } from '../components/Navigation';

const AppRoutes = () => {
  const [devMode, setDevMode] = useState(false);

  const element = useRoutes([
    { path: '/', element: <DashboardPage devMode={devMode} /> },
    { path: '/hosting/:spaceId', element: <HostingSpacePage /> },
    { path: '/editor/:spaceId', element: <EditorPage devMode={devMode} /> },
    { path: '/login', element: <LoginPage /> },
    { path: '/register', element: <RegisterPage /> }
  ]);

  return (
    <div className="app-shell">
      <Navigation devMode={devMode} onToggleDevMode={setDevMode} />
      <main>{element}</main>
    </div>
  );
};

export default AppRoutes;
