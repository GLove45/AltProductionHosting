import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { DevAssistant } from '../components/DevAssistant';
import { useHostingSpaces } from '../services/hostingHooks';
import { fetchDomainAnalytics, useUserDomains } from '../services/domainHooks';
import { SeoServiceOverview } from '../components/SeoServiceOverview';
import { DomainPerformancePanel } from '../components/DomainPerformancePanel';
import { DomainAnalytics } from '../types/domain';
import { useAuth } from '../contexts/AuthContext';
import { DomainRegistrationForm } from '../components/DomainRegistrationForm';
import { PasswordUpdateForm } from '../components/PasswordUpdateForm';
import { ExperienceJourney } from '../components/ExperienceJourney';

type DashboardPageProps = {
  devMode: boolean;
};

const DashboardPage = ({ devMode }: DashboardPageProps) => {
  const { user, isLoading: authLoading } = useAuth();
  const userId = user?.id ?? '';
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
  const activeDomains = (domains ?? []).filter((domain) => domain.status === 'active');
  const pendingDomains = (domains ?? []).filter((domain) => domain.status !== 'active');

  if (authLoading) {
    return (
      <section className="dashboard-loading">
        <h1>Loading your dashboard…</h1>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="dashboard-loading">
        <h1>Sign in to access your dashboard</h1>
        <p>Use the admin credentials to review domains, hosting spaces, and analytics.</p>
      </section>
    );
  }

  return (
    <DevAssistant
      devMode={devMode}
      message="Use the new domain control surface to register, secure, and observe every property from one sovereign stack."
    >
      <section className="hero-banner">
        <div className="hero-copy">
          <p className="eyebrow">Alt Production Labs · Sovereign Hosting</p>
          <h1>Domain control dashboard</h1>
          <p className="hero-lead">
            Register domains, auto-provision nginx, and keep bot policy, TLS, and analytics unified.
            Built for teams shipping on Raspberry Pi 5 clusters without sacrificing security.
          </p>
          <div className="hero-actions">
            <Link to="/" className="pill primary">Start free scan</Link>
            <Link to="/register" className="pill ghost">
              Request onboarding
            </Link>
          </div>
          <div className="hero-stats">
            <div className="stat-chip">
              <span className="stat-label">Active domains</span>
              <span className="stat-value">{activeDomains.length}</span>
              <span className="stat-subtext">Verified + serving traffic</span>
            </div>
            <div className="stat-chip">
              <span className="stat-label">Spaces online</span>
              <span className="stat-value">{spaces?.length ?? 0}</span>
              <span className="stat-subtext">Deployed across the cluster</span>
            </div>
            <div className="stat-chip">
              <span className="stat-label">Awaiting verification</span>
              <span className="stat-value">{pendingDomains.length}</span>
              <span className="stat-subtext">DNS/TLS checks running</span>
            </div>
          </div>
        </div>
        <div className="hero-panel">
          <DomainRegistrationForm />
          <div className="domain-status-list" aria-label="Recent domain activity">
            {(domains ?? []).map((domain) => (
              <article key={domain.id} className="status-card">
                <div>
                  <p className="status-label">{domain.registrarProvider} registrar</p>
                  <h3>{domain.name}</h3>
                  <p className="status-meta">
                    Added {new Date(domain.createdAt).toLocaleDateString()} · Token {domain.verificationToken}
                  </p>
                </div>
                <span className={`status-pill status-${domain.status}`} aria-label="Domain status">
                  {domain.status.replace('-', ' ')}
                </span>
              </article>
            ))}
            {(domains ?? []).length === 0 && (
              <p className="status-empty">No domains yet — register your first property to begin telemetry.</p>
            )}
          </div>
        </div>
      </section>

      <ExperienceJourney />

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

      <section className="security-stack" id="security-stack">
        <header className="section-header">
          <h2>Alt Production Labs: security AI</h2>
          <p>Real-time sentinel covers bot policy, TLS renewals, consent enforcement, and anomaly response.</p>
        </header>
        <div className="security-grid">
          <article className="security-card">
            <p className="eyebrow">01</p>
            <h3>Real-time Sentinel</h3>
            <p>
              Models learn normal behaviour per site and surface anomalies fast. Nginx configs, AWStats, and
              consent guard stay synchronised across nodes.
            </p>
          </article>
          <article className="security-card">
            <p className="eyebrow">02</p>
            <h3>Human-in-the-loop</h3>
            <p>
              Specialists validate findings to reduce false positives while coaching the model on what
              matters for your fleet.
            </p>
          </article>
          <article className="security-card">
            <p className="eyebrow">03</p>
            <h3>Resilience & recovery</h3>
            <p>
              If incidents are detected, affected services are isolated and restored with clear, audit-friendly
              summaries for customers.
            </p>
          </article>
        </div>
      </section>

      <section className="account-management">
        <header className="section-header">
          <h2>Access hardening</h2>
          <p>Rotate secrets, manage operators, and keep domain onboarding inside the same control plane.</p>
        </header>
        <div className="account-management-grid">
          <PasswordUpdateForm />
          <div className="stacked-card">
            <h3>Registrar automation</h3>
            <p>
              Python agents run on the Pi 5 cluster to write nginx server blocks, request TLS via certbot,
              and keep AWStats telemetry flowing into the dashboard.
            </p>
            <ul className="feature-list">
              <li>Automatic webroot creation per domain</li>
              <li>Consent-check endpoints for bot policy enforcement</li>
              <li>One-click nginx reload with validation</li>
            </ul>
          </div>
        </div>
      </section>

      <SeoServiceOverview analytics={aggregatedAnalytics} loading={isLoadingDomains || analyticsLoading} />

      <section className="domain-analytics-section" id="analytics">
        <header className="section-header">
          <h2>Domain performance studio</h2>
          <p>
            AWStats telemetry fused with SEO diagnostics for each property. Use this view to prioritise
            crawl fixes, monitor consent compliance, and celebrate traffic wins.
          </p>
        </header>

        {isLoadingDomains && <p className="loading-state">Loading domain inventory…</p>}
        {domainError && (
          <p className="error-state">
            Domains could not be retrieved right now. Refresh the page or verify your account access.
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
