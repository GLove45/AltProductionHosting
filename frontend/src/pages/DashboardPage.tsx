import { Link } from 'react-router-dom';
import { DevAssistant } from '../components/DevAssistant';
import { useHostingSpaces } from '../services/hostingHooks';

type DashboardPageProps = {
  devMode: boolean;
};

const DashboardPage = ({ devMode }: DashboardPageProps) => {
  const { data: spaces } = useHostingSpaces('demo-user');

  return (
    <DevAssistant devMode={devMode} message="Use the dashboard to create hosting spaces and manage domains.">
      <header>
        <h1>Your hosting dashboard</h1>
        <p>Select a space to open the drag-and-drop editor or manage raw files.</p>
      </header>
      <section className="spaces-grid">
        {spaces?.map((space) => (
          <article key={space.id} className="space-card">
            <h2>{space.name}</h2>
            <p>
              Storage: {space.storageUsedMb} / {space.storageLimitMb} MB
            </p>
            <div className="space-actions">
              <Link to={`/editor/${space.id}`}>Open editor</Link>
              <Link to={`/hosting/${space.id}`}>Manage files</Link>
            </div>
          </article>
        ))}
      </section>
    </DevAssistant>
  );
};

export default DashboardPage;
