import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../../lib/supabase';
import { useSessionContext } from '../../../../contexts/SessionContext';
import './CreateNewSession.css';
import { API_URL } from '../../../../config/api';

const GAME_MODES = [
  { label: 'Duelist Cup', value: 'duelist_cup' },
  { label: 'Rated', value: 'rated' },
  { label: 'Ladder', value: 'ladder' }
];

function CreateNewSession() {
  const { t } = useTranslation(['common']);
  const { refreshSessions } = useSessionContext();
  const [sessionName, setSessionName] = useState('');
  const [gameMode, setGameMode] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [gameModeSearch, setGameModeSearch] = useState('');
  const [showGameModeDropdown, setShowGameModeDropdown] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError(t('common.notAuthenticated'));
        return;
      }

      // Validate inputs
      if (!sessionName || !gameMode || !startTime || !endTime) {
        setError(t('ui.fillOutAllFields'));
        return;
      }

      // Convert datetime-local format to ISO timestamp
      const startsAt = new Date(startTime).toISOString();
      const endsAt = new Date(endTime).toISOString();

      const requestBody = {
        name: sessionName,
        game_mode: gameMode,
        starts_at: startsAt,
        ends_at: endsAt
      };

      // Create session via backend
      const response = await fetch(`${API_URL}/admin/sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('ui.failedCreateSession'));
      }

      setSuccess(t('ui.created'));
      // Refresh sessions list
      refreshSessions();
      // Reset form
      setSessionName('');
      setGameMode('');
      setStartTime('');
      setEndTime('');
    } catch (err) {
      setError(err.message || t('ui.failedCreateSession'));
    } finally {
      setLoading(false);
    }
  };

  const selectedModeLabel = GAME_MODES.find(m => m.value === gameMode)?.label;
  const filteredGameModes = GAME_MODES.filter(m => m.label.toLowerCase().includes(gameModeSearch.toLowerCase()));

  return (
    <div className="create-session-form-wrapper">
      <div className="create-session-form">
        {success && <div className="message success-message">{success}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="text"
              id="sessionName"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder={t('ui.sessionName')}
            />
          </div>

          <div className="form-group">
            <div className="dropdown-container">
              <button
                onClick={() => setShowGameModeDropdown(!showGameModeDropdown)}
                className={`dropdown-button ${showGameModeDropdown ? 'open' : ''}`}
                onBlur={() => setTimeout(() => setShowGameModeDropdown(false), 200)}
              >
                <span className="dropdown-label">
                  {selectedModeLabel || t('ui.selectGameMode')}
                </span>
                <svg className="dropdown-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06-.02L10 10.67l3.71-3.48a.75.75 0 111.02 1.1l-4.2 3.94a.75.75 0 01-1.02 0L5.25 8.29a.75.75 0 01-.02-1.08z" clipRule="evenodd"/>
                </svg>
              </button>
              {showGameModeDropdown && filteredGameModes.length > 0 && (
                <div className="dropdown-panel">
                  <ul className="dropdown-list">
                    {filteredGameModes.map(mode => (
                      <li key={mode.value}>
                        <button
                          className="dropdown-option"
                          onMouseDown={() => {
                            setGameMode(mode.value);
                            setGameModeSearch('');
                            setShowGameModeDropdown(false);
                          }}
                        >
                          {mode.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <input
              type="datetime-local"
              id="startTime"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          <div className="form-group">
            <input
              type="datetime-local"
              id="endTime"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>

          <button type="submit" className="submit-btn" disabled={loading || !sessionName || !gameMode || !startTime || !endTime}>
            {loading ? t('ui.creating') : t('ui.createSession')}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateNewSession;
