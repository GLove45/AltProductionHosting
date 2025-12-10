import PropTypes from 'prop-types';

export const DevAssistant = ({ devMode = false, children = null, message = '' }) => {
  return (
    <div className={`dev-assistant ${devMode ? 'dev' : 'beginner'}`}>
      <div className="assistant-banner">
        <div>
          <p className="eyebrow">Matrix Ops AI</p>
          <h2>{devMode ? 'Developer mode' : 'Beginner mode'}</h2>
          <p>{message}</p>
        </div>
        <div className="assistant-meta">
          <span className="pill ghost small">Keyboard</span>
          <span className="pill ghost small">Telemetry</span>
          <span className="pill ghost small">Guidance</span>
        </div>
      </div>
      <div className="assistant-content">{children}</div>
    </div>
  );
};

DevAssistant.propTypes = {
  devMode: PropTypes.bool,
  children: PropTypes.node,
  message: PropTypes.string
};
