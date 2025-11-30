import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useSessionContext } from '../../../../contexts/SessionContext';
import './ArchiveSession.css';

function ArchiveSession() {
  const { t } = useTranslation(['common']);
  const { archivedSessions, loading: contextLoading } = useSessionContext();
  const [selectedSession, setSelectedSession] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Close dropdown on ESC key
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowDropdown(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSessionSelect = (sessionId) => {
    setSelectedSession(sessionId);
    setShowDropdown(false);
  };

  const handleViewSession = () => {
    if (!selectedSession) return;
    navigate(`/archive/${selectedSession}`);
  };

  if (contextLoading) {
    return <div className="archive-session">{t('ui.loadingArchivedSessions')}</div>;
  }

  const selectedSessionData = archivedSessions.find(s => s.id === parseInt(selectedSession));

  return (
    <div className="archive-session">
      {error && <div className="message error-message">{error}</div>}

      <div className="session-selector">
        {/* Custom Dropdown */}
        <div className="dropdown-container" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className={`dropdown-button ${showDropdown ? 'open' : ''}`}
            aria-haspopup="true"
            aria-expanded={showDropdown}
          >
            <span className="dropdown-label">
              {selectedSessionData 
                ? selectedSessionData.name
                : t('ui.chooseSession')
              }
            </span>
            <svg className="dropdown-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06-.02L10 10.67l3.71-3.48a.75.75 0 111.02 1.1l-4.2 3.94a.75.75 0 01-1.02 0L5.25 8.29a.75.75 0 01-.02-1.08z" clipRule="evenodd"/>
            </svg>
          </button>

          {showDropdown && (
            <div className="dropdown-panel" role="menu" aria-hidden={!showDropdown}>
              <ul className="dropdown-list">
                {archivedSessions.length === 0 ? (
                  <li className="dropdown-empty">{t('ui.noArchivedSessionsAvailable')}</li>
                ) : (
                  archivedSessions.map((session) => (
                    <li key={session.id} role="menuitem">
                      <button
                        className="dropdown-option"
                        onClick={() => handleSessionSelect(session.id)}
                      >
                        <div className="session-name">{session.name}</div>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>

        <button
          className="view-btn"
          onClick={handleViewSession}
          disabled={!selectedSession}
        >
          {t('ui.viewSession')}
        </button>
      </div>

      {archivedSessions.length === 0 && !contextLoading && (
        <p className="empty-message">
          {t('ui.noArchivedSessionsFound')}
        </p>
      )}
    </div>
  );
}

export default ArchiveSession;