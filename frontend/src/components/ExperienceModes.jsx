import PropTypes from 'prop-types';

const ModeCard = ({ title, children, active = false }) => (
  <article className={`mode-card ${active ? 'active' : ''}`}>
    <header className="mode-card-header">
      <p className="eyebrow">Experience</p>
      <h3>{title}</h3>
    </header>
    <div className="mode-card-body">{children}</div>
  </article>
);

ModeCard.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  active: PropTypes.bool
};

export const ExperienceModes = ({ devMode, onToggleDevMode }) => {
  return (
    <section className="experience-modes">
      <div className="section-header">
        <h2>Beginner & Dev control surfaces</h2>
        <p>
          Swap modes instantly to surface either guided wizards with safe defaults or raw telemetry, logs, and automation
          triggers. The UI remembers your preference.
        </p>
      </div>
      <div className="mode-grid">
        <ModeCard title="Beginner mode">
          <ul className="feature-list">
            <li>Guided flows with inline rationale and guardrails</li>
            <li>One-click SSL, backup defaults, and registrar presets</li>
            <li>Plain-language tooltips with “why this matters” context</li>
          </ul>
          <div className="mode-actions">
            <span className="pill ghost small">Focus: safety</span>
            <span className="pill ghost small">Motion reduced</span>
          </div>
        </ModeCard>
        <ModeCard title="Dev mode" active={devMode}>
          <ul className="feature-list">
            <li>Expose SSH, Git hooks, live logs, and config diffs</li>
            <li>Hotkeys, command palette, and JSON/YAML editors</li>
            <li>Live metrics with anomaly glow and rollback links</li>
          </ul>
          <label className="dev-mode-toggle-inline">
            <input type="checkbox" checked={devMode} onChange={(event) => onToggleDevMode(event.target.checked)} />
            <span>Dev mode</span>
          </label>
        </ModeCard>
      </div>
    </section>
  );
};

ExperienceModes.propTypes = {
  devMode: PropTypes.bool.isRequired,
  onToggleDevMode: PropTypes.func.isRequired
};
