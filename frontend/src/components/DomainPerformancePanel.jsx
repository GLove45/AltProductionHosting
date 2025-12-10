import PropTypes from 'prop-types';

const formatNumber = (value) => new Intl.NumberFormat().format(value);

export const DomainPerformancePanel = ({ domain, analytics, isLoading, isError }) => {
  const periodLabel = analytics ? `${analytics.awstats.period.month} ${analytics.awstats.period.year}` : 'Telemetry pending';

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
          Unable to load analytics for this domain right now. Retry shortly or review integration status.
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
                {analytics.awstats.topKeywords.slice(0, 3).map((keyword) => (
                  <li key={keyword.keyword}>
                    <span className="list-primary">{keyword.keyword}</span>
                    <span className="list-secondary">{formatNumber(keyword.visits)} visits</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="seo-insights compact">
            <div>
              <h4>Active issues</h4>
              <ul>
                {analytics.seo.issues.slice(0, 2).map((issue) => (
                  <li key={issue.id}>
                    <span className={`issue-pill severity-${issue.severity}`}>{issue.severity}</span>
                    <div>
                      <p className="list-primary">{issue.title}</p>
                      <p className="list-secondary">{issue.recommendation}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4>Action plan</h4>
              <ul>
                {analytics.seo.actionPlan.slice(0, 2).map((action) => (
                  <li key={action.id}>
                    <span className={`issue-pill severity-${action.priority}`}>{action.priority}</span>
                    <div>
                      <p className="list-primary">{action.title}</p>
                      <p className="list-secondary">Owner: {action.owner}</p>
                    </div>
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

DomainPerformancePanel.propTypes = {
  domain: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    registrarProvider: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    createdAt: PropTypes.string.isRequired,
    verifiedAt: PropTypes.string,
    updatedAt: PropTypes.string,
    verificationToken: PropTypes.string,
    userId: PropTypes.string
  }).isRequired,
  analytics: PropTypes.shape({
    awstats: PropTypes.shape({
      period: PropTypes.shape({
        month: PropTypes.string.isRequired,
        year: PropTypes.number.isRequired
      }).isRequired,
      totals: PropTypes.shape({
        visits: PropTypes.number,
        uniqueVisitors: PropTypes.number,
        pages: PropTypes.number,
        hits: PropTypes.number,
        bandwidthMb: PropTypes.number,
        avgVisitDuration: PropTypes.string,
        bounceRate: PropTypes.number
      }).isRequired,
      trafficSources: PropTypes.arrayOf(
        PropTypes.shape({
          source: PropTypes.string,
          visits: PropTypes.number,
          change: PropTypes.number,
          percentage: PropTypes.number
        })
      ),
      topPages: PropTypes.arrayOf(
        PropTypes.shape({
          url: PropTypes.string,
          views: PropTypes.number,
          entryRate: PropTypes.number,
          exitRate: PropTypes.number
        })
      ),
      topKeywords: PropTypes.arrayOf(
        PropTypes.shape({
          keyword: PropTypes.string,
          visits: PropTypes.number,
          position: PropTypes.number
        })
      )
    }).isRequired,
    seo: PropTypes.shape({
      healthScore: PropTypes.number,
      lighthouse: PropTypes.shape({ performance: PropTypes.number }),
      issues: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.string,
          title: PropTypes.string,
          severity: PropTypes.string,
          recommendation: PropTypes.string
        })
      ),
      actionPlan: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.string,
          title: PropTypes.string,
          priority: PropTypes.string,
          owner: PropTypes.string
        })
      )
    }).isRequired
  }),
  isLoading: PropTypes.bool.isRequired,
  isError: PropTypes.bool.isRequired
};
