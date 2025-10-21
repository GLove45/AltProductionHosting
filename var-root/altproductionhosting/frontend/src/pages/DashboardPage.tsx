import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { DevAssistant } from '../components/DevAssistant';
import { useHostingSpaces } from '../services/hostingHooks';
import { fetchDomainAnalytics, useUserDomains } from '../services/domainHooks';
import { SeoServiceOverview } from '../components/SeoServiceOverview';
import { DomainPerformancePanel } from '../components/DomainPerformancePanel';
import { DomainAnalytics } from '../types/domain';

type DashboardPageProps = {
  devMode: boolean;
};

const DashboardPage = ({ devMode }: DashboardPageProps) => {
  const userId = 'demo-user';
  const { data: spaces } = useHostingSpaces(userId);
  const {
    data: domains,
    isLoading: isLoadingDomains,
    isError: domainError
  } = useUserDomains(userId);

  const analyticsQueries = useQueries({
    queries:
      domains?.map((domain) => ({
        queryKey: ['domain-analytics', domain.id] as const,
        queryFn: () => fetchDomainAnalytics(domain.id),
        enabled: !!domain.id
      })) ?? []
  });

  const aggregatedAnalytics = useMemo(() => {
    const analytics: DomainAnalytics[] = [];
    analyticsQueries.forEach((query) => {
      if (query.data) {
        analytics.push(query.data);
      }
    });
    return analytics;
  }, [analyticsQueries]);

  const analyticsLoading = analyticsQueries.some((query) => query.isLoading);

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

      <SeoServiceOverview analytics={aggregatedAnalytics} loading={isLoadingDomains || analyticsLoading} />

      <section className="domain-analytics-section">
        <header className="section-header">
          <h2>Domain performance intelligence</h2>
          <p>
            AWStats-style telemetry fused with SEO diagnostics for each connected property. Use
            this view to spot anomalies, celebrate wins, and prioritise next actions.
          </p>
        </header>

        {isLoadingDomains && <p className="loading-state">Loading domain inventory…</p>}
        {domainError && (
          <p className="error-state">
            Domains could not be retrieved right now. Refresh the page or verify your account
            access.
          </p>
        )}

        <div className="domain-grid">
          {(domains ?? []).map((domain, index) => {
            const query = analyticsQueries[index];
            return (
              <DomainPerformancePanel
                key={domain.id}
                domain={domain}
                analytics={query?.data}
                isLoading={query?.isLoading ?? false}
                isError={query?.isError ?? false}
              />
            );
          })}
        </div>
      </section>
    </DevAssistant>
  );
};

export default DashboardPage;
