import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useSessionContext } from '../../../../contexts/SessionContext';
import { useNavigate } from 'react-router-dom';
import './ActiveSession.css';

function ActiveSession() {
  const { sessions, tiers, loading: contextLoading } = useSessionContext();
  const [selectedSession, setSelectedSession] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showLadderModal, setShowLadderModal] = useState(false);
  const [initialTier, setInitialTier] = useState('');
  const [initialNetWins, setInitialNetWins] = useState(0);
  const [showTierDropdown, setShowTierDropdown] = useState(false);
  const [showWinsDropdown, setShowWinsDropdown] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const tierDropdownRef = useRef(null);
  const winsDropdownRef = useRef(null);

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

  const handleJoinClick = async () => {
    if (!selectedSession) return;

    const session = sessions.find(s => s.id === parseInt(selectedSession));
    
    if (session?.game_mode === 'ladder') {
      try {
        const { data: { session: authSession } } = await supabase.auth.getSession();
        const response = await fetch(`http://localhost:3001/api/sessions/${selectedSession}/participant-check`, {
          headers: {
            'Authorization': `Bearer ${authSession?.access_token}`
          }
        });
        const data = await response.json();
        
        if (data.isParticipant) {
          navigate(`/session/${selectedSession}`);
        } else {
          setShowLadderModal(true);
        }
      } catch (err) {
        setError('Failed to check session status');
      }
    } else {
      handleJoinSession();
    }
  };

  const handleJoinSession = async () => {
    if (!selectedSession) return;

    setJoining(true);
    setError('');
    setSuccess('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      const body = {
        sessionId: selectedSession
      };

      const selectedSessionData = sessions.find(s => s.id === parseInt(selectedSession));
      if (selectedSessionData?.game_mode === 'ladder') {
        body.initialTierId = initialTier;
        body.initialNetWins = initialNetWins;
      }

      const response = await fetch('http://localhost:3001/api/sessions/join', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join session');
      }

      navigate(`/session/${selectedSession}`);
    } catch (err) {
      setError(err.message || 'Failed to join session');
    } finally {
      setJoining(false);
      setShowLadderModal(false);
    }
  };

  if (contextLoading) {
    return <div className="active-session">Loading sessions...</div>;
  }

  const selectedSessionData = sessions.find(s => s.id === parseInt(selectedSession));

  return (
    <div className="active-session">
      {error && <div className="message error-message">{error}</div>}
      {success && <div className="message success-message">{success}</div>}

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
                ? `${selectedSessionData.name} (${selectedSessionData.game_mode})`
                : 'Choose a session...'
              }
            </span>
            <svg className="dropdown-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06-.02L10 10.67l3.71-3.48a.75.75 0 111.02 1.1l-4.2 3.94a.75.75 0 01-1.02 0L5.25 8.29a.75.75 0 01-.02-1.08z" clipRule="evenodd"/>
            </svg>
          </button>

          {showDropdown && (
            <div className="dropdown-panel" role="menu" aria-hidden={!showDropdown}>
              <ul className="dropdown-list">
                {sessions.length === 0 ? (
                  <li className="dropdown-empty">No active sessions available</li>
                ) : (
                  sessions.map((session) => (
                    <li key={session.id} role="menuitem">
                      <button
                        className="dropdown-option"
                        onClick={() => handleSessionSelect(session.id)}
                      >
                        <div className="session-name">{session.name}</div>
                        <div className="session-mode">Mode: {session.game_mode}</div>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>

        <button
          className="join-btn"
          onClick={handleJoinClick}
          disabled={!selectedSession || joining}
        >
          {joining ? 'Joining...' : 'Join Session'}
        </button>
      </div>

      {showLadderModal && (
        <div className="modal-overlay" onClick={() => setShowLadderModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Ladder Session Setup</h3>
            <p>Enter your starting rank information</p>
            
            <div className="form-group">
              <div className="dropdown-container" ref={tierDropdownRef}>
                <button
                  onClick={() => setShowTierDropdown(!showTierDropdown)}
                  className={`modal-dropdown-button ${showTierDropdown ? 'open' : ''}`}
                  onBlur={() => setTimeout(() => setShowTierDropdown(false), 200)}
                >
                  <span className="dropdown-label">
                    {initialTier ? tiers.find(t => t.id === parseInt(initialTier))?.tier_name : 'Select tier...'}
                  </span>
                  <svg className="dropdown-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06-.02L10 10.67l3.71-3.48a.75.75 0 111.02 1.1l-4.2 3.94a.75.75 0 01-1.02 0L5.25 8.29a.75.75 0 01-.02-1.08z" clipRule="evenodd"/>
                  </svg>
                </button>
                {showTierDropdown && (
                  <div className="modal-dropdown-panel">
                    <ul className="dropdown-list">
                      {tiers.map((tier) => (
                        <li key={tier.id}>
                          <button
                            className="dropdown-option"
                            onMouseDown={() => {
                              setInitialTier(tier.id);
                              setShowTierDropdown(false);
                            }}
                          >
                            {tier.tier_name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <div className="dropdown-container" ref={winsDropdownRef}>
                <button
                  onClick={() => setShowWinsDropdown(!showWinsDropdown)}
                  className={`modal-dropdown-button ${showWinsDropdown ? 'open' : ''}`}
                  disabled={!initialTier}
                  onBlur={() => setTimeout(() => setShowWinsDropdown(false), 200)}
                >
                  <span className="dropdown-label">
                    {initialNetWins !== 0 ? initialNetWins : 'Select wins...'}
                  </span>
                  <svg className="dropdown-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06-.02L10 10.67l3.71-3.48a.75.75 0 111.02 1.1l-4.2 3.94a.75.75 0 01-1.02 0L5.25 8.29a.75.75 0 01-.02-1.08z" clipRule="evenodd"/>
                  </svg>
                </button>
                {showWinsDropdown && initialTier && (
                  <div className="modal-dropdown-panel">
                    <ul className="dropdown-list">
                      {Array.from(
                        { length: (tiers.find(t => t.id === parseInt(initialTier))?.wins_required || 5) + 1 },
                        (_, i) => i
                      ).map(num => (
                        <li key={num}>
                          <button
                            className="dropdown-option"
                            onMouseDown={() => {
                              setInitialNetWins(num);
                              setShowWinsDropdown(false);
                            }}
                          >
                            {num}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-actions">
              <button 
                className="cancel-btn" 
                onClick={() => setShowLadderModal(false)}
              >
                Cancel
              </button>
              <button 
                className="confirm-btn" 
                onClick={handleJoinSession}
                disabled={!initialTier}
              >
                Join Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ActiveSession;