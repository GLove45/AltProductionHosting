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
  return (
    <article className="domain-card">
      <header className="domain-card-header">
        <div>
          <h3>{domain.name}</h3>
          <p>
            Registrar: <strong>{domain.registrarProvider}</strong> · Status:{' '}
            <span className={`status-pill status-${domain.status}`}>{domain.status}</span>
          </p>
        </div>
        <div className="domain-metadata">
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
          <section className="awstats-overview">
            <header>
              <h4>
                AWStats snapshot · {analytics.awstats.period.month} {analytics.awstats.period.year}
              </h4>
              <p>Visitor behaviour, engagement, and resource consumption by the numbers.</p>
            </header>
            <div className="stat-grid">
              <div className="stat-cell">
                <span className="stat-label">Visits</span>
                <span className="stat-value">{formatNumber(analytics.awstats.totals.visits)}</span>
              </div>
              <div className="stat-cell">
                <span className="stat-label">Unique visitors</span>
                <span className="stat-value">
                  {formatNumber(analytics.awstats.totals.uniqueVisitors)}
                </span>
              </div>
              <div className="stat-cell">
                <span className="stat-label">Pages viewed</span>
                <span className="stat-value">{formatNumber(analytics.awstats.totals.pages)}</span>
              </div>
              <div className="stat-cell">
                <span className="stat-label">Hits</span>
                <span className="stat-value">{formatNumber(analytics.awstats.totals.hits)}</span>
              </div>
              <div className="stat-cell">
                <span className="stat-label">Bandwidth</span>
                <span className="stat-value">{formatNumber(analytics.awstats.totals.bandwidthMb)} MB</span>
              </div>
              <div className="stat-cell">
                <span className="stat-label">Avg. visit duration</span>
                <span className="stat-value">{analytics.awstats.totals.avgVisitDuration}</span>
              </div>
              <div className="stat-cell">
                <span className="stat-label">Bounce rate</span>
                <span className="stat-value">{analytics.awstats.totals.bounceRate}%</span>
              </div>
            </div>

            <div className="traffic-sources">
              <h5>Traffic sources</h5>
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
          </section>

          <section className="top-assets">
            <div>
              <h4>Top pages</h4>
              <ul>
                {analytics.awstats.topPages.map((page) => (
                  <li key={page.url}>
                    <span className="list-primary">{page.url}</span>
                    <span className="list-secondary">
                      {formatNumber(page.views)} views · Entry {page.entryRate}% · Exit {page.exitRate}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4>Top keywords</h4>
              <ul>
                {analytics.awstats.topKeywords.map((keyword) => (
                  <li key={keyword.keyword}>
                    <span className="list-primary">{keyword.keyword}</span>
                    <span className="list-secondary">
                      {formatNumber(keyword.visits)} visits · Rank #{keyword.position}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4>Referrers & locations</h4>
              <ul>
                {analytics.awstats.topReferrers.map((referrer) => (
                  <li key={referrer.source}>
                    <span className="list-primary">{referrer.source}</span>
                    <span className="list-secondary">
                      {formatNumber(referrer.visits)} visits · {referrer.type}
                    </span>
                  </li>
                ))}
              </ul>
              <ul>
                {analytics.awstats.topCountries.map((country) => (
                  <li key={country.country}>
                    <span className="list-primary">{country.country}</span>
                    <span className="list-secondary">
                      {formatNumber(country.visits)} visits · {formatNumber(country.bandwidthMb)} MB
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="seo-deep-dive">
            <div className="seo-detail">
              <h4>Keyword monitoring</h4>
              <p>
                Tracking {analytics.seo.keywordRankings.length} priority keywords with twice-daily
                SERP checks and intent clustering.
              </p>
              <ul>
                {analytics.seo.keywordRankings.slice(0, 4).map((keyword) => (
                  <li key={keyword.keyword}>
                    <span className="list-primary">{keyword.keyword}</span>
                    <span className="list-secondary">
                      #{keyword.position} · Δ {keyword.change >= 0 ? '+' : ''}
                      {keyword.change} · {keyword.searchVolume.toLocaleString()} searches/mo
                    </span>
                  </li>
                ))}
              </ul>
            </div>

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
              <h4>Lighthouse quality</h4>
              <ul className="lighthouse-grid">
                <li>
                  Performance <span>{analytics.seo.lighthouse.performance}</span>
                </li>
                <li>
                  Accessibility <span>{analytics.seo.lighthouse.accessibility}</span>
                </li>
                <li>
                  Best practices <span>{analytics.seo.lighthouse.bestPractices}</span>
                </li>
                <li>
                  SEO <span>{analytics.seo.lighthouse.seo}</span>
                </li>
              </ul>
              <h4>HTTP status distribution</h4>
              <ul>
                {analytics.awstats.httpStatus.map((status) => (
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
        </div>
      )}
    </article>
  );
};
