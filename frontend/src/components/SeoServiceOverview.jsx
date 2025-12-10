import PropTypes from 'prop-types';

const formatPercent = (value) => `${value}%`;

const getAverage = (values) => {
  if (!values.length) {
    return 0;
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round(total / values.length);
};

const sortByPriority = (items) =>
  [...items].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const priorityDiff = (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    return a.dueDate.localeCompare(b.dueDate);
  });

const selectTopIssues = (issues, limit = 4) =>
  [...issues]
    .sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, notice: 2 };
      const severityDiff = (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3);
      if (severityDiff !== 0) {
        return severityDiff;
      }
      return b.affectedPages - a.affectedPages;
    })
    .slice(0, limit);

export const SeoServiceOverview = ({ analytics, loading = false }) => {
  if (loading) {
    return (
      <section className="seo-service">
        <header className="section-header">
          <h2>SEO service intelligence</h2>
          <p>Loading the latest crawl, ranking, and competitive intelligence…</p>
        </header>
      </section>
    );
  }

  if (!analytics.length) {
    return (
      <section className="seo-service">
        <header className="section-header">
          <h2>SEO service intelligence</h2>
          <p>Add a domain to unlock site audits, keyword tracking, and backlink monitoring.</p>
        </header>
      </section>
    );
  }

  const averageHealth = getAverage(analytics.map((item) => item.seo.healthScore));
  const averagePageSpeed = getAverage(analytics.map((item) => item.seo.pageSpeedScore));
  const averageMobile = getAverage(analytics.map((item) => item.seo.mobileUsabilityScore));
  const totalKeywords = analytics.reduce((sum, item) => sum + item.seo.keywordRankings.length, 0);
  const totalBacklinks = analytics.reduce((sum, item) => sum + item.seo.backlinkProfile.totalBacklinks, 0);
  const totalReferringDomains = analytics.reduce(
    (sum, item) => sum + item.seo.backlinkProfile.referringDomains,
    0
  );

  const aggregatedIssues = analytics.flatMap((item) => item.seo.issues);
  const aggregatedActionPlan = sortByPriority(analytics.flatMap((item) => item.seo.actionPlan));
  const criticalIssues = selectTopIssues(aggregatedIssues);
  const serpFeatures = Array.from(new Set(analytics.flatMap((item) => item.seo.serpFeatures))).slice(0, 6);
  const monitoringCapabilities = Array.from(new Set(analytics.flatMap((item) => item.seo.monitoringCapabilities)));

  const numberFormatter = new Intl.NumberFormat();

  return (
    <section className="seo-service">
      <header className="section-header">
        <h2>SEO service intelligence</h2>
        <p>
          Unified SEO operations across {analytics.length} domains with crawl diagnostics, rank tracking, backlink monitoring,
          and competitor benchmarking delivered in one command center.
        </p>
      </header>

      <div className="seo-summary-grid">
        <article className="metric-card">
          <span className="metric-label">Average health score</span>
          <span className="metric-value">{formatPercent(averageHealth)}</span>
          <p className="metric-subtext">
            Composite of crawlability, Core Web Vitals, structured data, and index coverage.
          </p>
        </article>
        <article className="metric-card">
          <span className="metric-label">Average page speed</span>
          <span className="metric-value">{formatPercent(averagePageSpeed)}</span>
          <p className="metric-subtext">Lighthouse performance averaged across active templates.</p>
        </article>
        <article className="metric-card">
          <span className="metric-label">Mobile usability</span>
          <span className="metric-value">{formatPercent(averageMobile)}</span>
          <p className="metric-subtext">Viewport, tap target, and font legibility audit score.</p>
        </article>
        <article className="metric-card">
          <span className="metric-label">Keywords & backlinks tracked</span>
          <span className="metric-value">
            {numberFormatter.format(totalKeywords)} / {numberFormatter.format(totalBacklinks)}
          </span>
          <p className="metric-subtext">
            Keywords monitored daily alongside {numberFormatter.format(totalReferringDomains)}&nbsp;referring domains.
          </p>
        </article>
      </div>

      <div className="seo-insights-grid">
        <article className="seo-issues">
          <header>
            <h3>High-impact issues</h3>
            <p>Prioritized findings from site audits and Core Web Vitals monitors.</p>
          </header>
          <ul>
            {criticalIssues.map((issue) => (
              <li key={issue.id} className={`issue-item issue-${issue.severity}`}>
                <div className="issue-header">
                  <span className="issue-severity">{issue.severity}</span>
                  <h4>{issue.title}</h4>
                </div>
                <p>{issue.description}</p>
                <p className="issue-recommendation">{issue.recommendation}</p>
                <span className="issue-impact">Impact: {issue.impact}</span>
                <span className="issue-pages">Affected pages: {issue.affectedPages}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="seo-action-plan">
          <header>
            <h3>Action plan</h3>
            <p>Workflow-ready tasks synced to owners, deadlines, and expected impact.</p>
          </header>
          <ul>
            {aggregatedActionPlan.map((action) => (
              <li key={action.id} className={`action-item action-${action.status}`}>
                <div className="action-header">
                  <span className={`status-pill status-${action.status}`}>{action.status}</span>
                  <span className={`priority-pill priority-${action.priority}`}>{action.priority} priority</span>
                </div>
                <h4>{action.title}</h4>
                <p>{action.impact}</p>
                <div className="action-meta">
                  <span>Owner: {action.owner}</span>
                  <span>Due {action.dueDate}</span>
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className="seo-capabilities">
          <header>
            <h3>Capabilities unlocked</h3>
            <p>Everything you need to run an enterprise-grade SEO program from one dashboard.</p>
          </header>
          <ul className="capability-list">
            {monitoringCapabilities.map((capability) => (
              <li key={capability}>{capability}</li>
            ))}
          </ul>
          {serpFeatures.length > 0 && (
            <div className="serp-feature-list">
              <h4>Current SERP features captured</h4>
              <div className="chip-row">
                {serpFeatures.map((feature) => (
                  <span key={feature} className="chip">
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          )}
        </article>
      </div>
    </section>
  );
};

SeoServiceOverview.propTypes = {
  analytics: PropTypes.arrayOf(
    PropTypes.shape({
      seo: PropTypes.shape({
        healthScore: PropTypes.number.isRequired,
        pageSpeedScore: PropTypes.number.isRequired,
        mobileUsabilityScore: PropTypes.number.isRequired,
        keywordRankings: PropTypes.array.isRequired,
        backlinkProfile: PropTypes.shape({
          totalBacklinks: PropTypes.number.isRequired,
          referringDomains: PropTypes.number.isRequired
        }).isRequired,
        issues: PropTypes.array.isRequired,
        actionPlan: PropTypes.array.isRequired,
        serpFeatures: PropTypes.array.isRequired,
        monitoringCapabilities: PropTypes.array.isRequired
      }).isRequired
    })
  ).isRequired,
  loading: PropTypes.bool
};
