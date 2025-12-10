import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

export const CommandPalette = ({ open, onClose, commands }) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = useMemo(() => {
    const lower = query.toLowerCase();
    return commands.filter((command) =>
      `${command.label} ${command.description} ${command.category ?? ''}`.toLowerCase().includes(lower)
    );
  }, [commands, query]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (!open) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, filtered.length - 1));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      } else if (event.key === 'Enter' && filtered[activeIndex]) {
        event.preventDefault();
        filtered[activeIndex].action();
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, filtered, onClose, open]);

  if (!open) return null;

  return (
    <div className="command-palette-overlay" role="dialog" aria-label="Command palette">
      <div className="command-palette">
        <header className="palette-header">
          <div>
            <p className="eyebrow">Matrix Ops</p>
            <h3>Command palette</h3>
          </div>
          <span className="hotkey-hint">Esc</span>
        </header>
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="palette-input"
          placeholder="Search actions, pages, and automations"
        />
        <ul className="palette-results" role="listbox">
          {filtered.map((command, index) => (
            <li
              key={command.id}
              className={`palette-result ${index === activeIndex ? 'active' : ''}`}
              aria-selected={index === activeIndex}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => {
                command.action();
                onClose();
              }}
            >
              <div>
                <p className="palette-label">{command.label}</p>
                <p className="palette-description">{command.description}</p>
              </div>
              <div className="palette-meta">
                {command.badge && <span className="status-pill status-active">{command.badge}</span>}
                {command.category && <span className="pill ghost small">{command.category}</span>}
              </div>
            </li>
          ))}
          {filtered.length === 0 && <li className="palette-empty">No commands match “{query}”.</li>}
        </ul>
      </div>
    </div>
  );
};

CommandPalette.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  commands: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
      action: PropTypes.func.isRequired,
      badge: PropTypes.string,
      category: PropTypes.string
    })
  ).isRequired
};
