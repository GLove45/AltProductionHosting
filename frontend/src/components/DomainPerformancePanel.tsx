import { Domain } from '../types/domain';
import { DomainAnalytics } from '../types/domain';

type DomainPerformancePanelProps = {
  domain: Domain;
  analytics?: DomainAnalytics;
  isLoading: boolean;
  isError: boolean;
};

const formatNumber = (value: number) => new Intl.NumberFormat().format(value);

export const DomainPerformancePanel = ({
  domain,
  analytics,
  isLoading,
  isError
}: DomainPerformancePanelProps) => {
  const periodLabel = analytics
    ? `${analytics.awstats.period.month} ${analytics.awstats.period.year}`
    : 'Telemetry pending';

  return (
    <article className="domain-card domain-card-modern">
      <header className="domain-card-header">
        <div>
          <p className="eyebrow">{periodLabel}</p>
          <h3>{domain.name}</h3>
          <p>
            Registrar: <strong>{domain.registrarProvider}</strong>
          </p>
        </div>
        <div className="domain-metadata">
          <span className={`status-pill status-${domain.status}`}>{domain.status}</span>
          <span>Tracking since {new Date(domain.createdAt).toLocaleDateString()}</span>
          {domain.verifiedAt ? (
            <span>Verified {new Date(domain.verifiedAt).toLocaleDateString()}</span>
          ) : (
            <span className="status-pill status-pending">Awaiting verification</span>
          )}
        </div>
      </header>

      {isLoading && <p className="loading-state">Loading analytics intelligence…</p>}
      {isError && (
        <p className="error-state">
          Unable to load analytics for this domain right now. Retry shortly or review integration
          status.
        </p>
      )}

      {analytics && !isLoading && !isError && (
        <div className="domain-analytics-grid">
          <div className="signal-grid">
            <div className="signal-card">
              <p className="signal-label">SEO health</p>
              <p className="signal-value">{analytics.seo.healthScore}</p>
              <p className="signal-subtext">Lighthouse perf {analytics.seo.lighthouse.performance}/100</p>
            </div>
            <div className="signal-card">
              <p className="signal-label">Visits this period</p>
              <p className="signal-value">{formatNumber(analytics.awstats.totals.visits)}</p>
              <p className="signal-subtext">Unique {formatNumber(analytics.awstats.totals.uniqueVisitors)}</p>
            </div>
            <div className="signal-card">
              <p className="signal-label">Bandwidth</p>
              <p className="signal-value">{formatNumber(analytics.awstats.totals.bandwidthMb)} MB</p>
              <p className="signal-subtext">Bounce rate {analytics.awstats.totals.bounceRate}%</p>
            </div>
          </div>

          <section className="awstats-overview condensed">
            <header>
              <h4>Traffic mix</h4>
              <p>Top sources feeding the stack.</p>
            </header>
            <div className="traffic-sources">
              <ul>
                {analytics.awstats.trafficSources.map((source) => (
                  <li key={source.source}>
                    <span>{source.source}</span>
                    <span>
                      {formatNumber(source.visits)} visits · {source.percentage}% ({source.change}% Δ)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="stat-grid">
              <div className="stat-cell">
                <span className="stat-label">Pages</span>
                <span className="stat-value">{formatNumber(analytics.awstats.totals.pages)}</span>
              </div>
              <div className="stat-cell">
                <span className="stat-label">Hits</span>
                <span className="stat-value">{formatNumber(analytics.awstats.totals.hits)}</span>
              </div>
              <div className="stat-cell">
                <span className="stat-label">Avg duration</span>
                <span className="stat-value">{analytics.awstats.totals.avgVisitDuration}</span>
              </div>
            </div>
          </section>

          <section className="top-assets compact">
            <div>
              <h4>Top pages</h4>
              <ul>
                {analytics.awstats.topPages.slice(0, 3).map((page) => (
                  <li key={page.url}>
                    <span className="list-primary">{page.url}</span>
                    <span className="list-secondary">
                      {formatNumber(page.views)} views · Entry {page.entryRate}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4>Keywords</h4>
              <ul>
                {analytics.seo.keywordRankings.slice(0, 3).map((keyword) => (
                  <li key={keyword.keyword}>
                    <span className="list-primary">{keyword.keyword}</span>
                    <span className="list-secondary">
                      #{keyword.position} · Δ {keyword.change >= 0 ? '+' : ''}
                      {keyword.change}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4>Reliability</h4>
              <ul>
                {analytics.awstats.httpStatus.slice(0, 3).map((status) => (
                  <li key={status.code}>
                    <span className="list-primary">{status.code}</span>
                    <span className="list-secondary">
                      {status.description} · {formatNumber(status.count)} events
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="seo-deep-dive compact">
            <div className="seo-detail">
              <h4>Backlink authority</h4>
              <p>
                {formatNumber(analytics.seo.backlinkProfile.totalBacklinks)} backlinks across{' '}
                {formatNumber(analytics.seo.backlinkProfile.referringDomains)} referring domains.
              </p>
              <ul>
                <li>
                  Authority score {analytics.seo.backlinkProfile.authorityScore}/100 · New last 30d{' '}
                  {analytics.seo.backlinkProfile.newLast30Days} · Lost {analytics.seo.backlinkProfile.lostLast30Days}
                </li>
                <li>Top anchors: {analytics.seo.backlinkProfile.topAnchorTexts.join(', ')}</li>
              </ul>
            </div>

            <div className="seo-detail">
              <h4>Structured data</h4>
              <ul>
                {analytics.seo.structuredData.map((schema) => (
                  <li key={schema.schemaType}>
                    <span className="list-primary">{schema.schemaType}</span>
                    <span className={`schema-status schema-${schema.status}`}>
                      {schema.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      )}
    </article>
  );
};
