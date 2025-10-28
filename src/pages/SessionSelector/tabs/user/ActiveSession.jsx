import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import './ActiveSession.css';

function ActiveSession() {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showLadderModal, setShowLadderModal] = useState(false);
  const [tiers, setTiers] = useState([]);
  const [initialTier, setInitialTier] = useState('');
  const [initialNetWins, setInitialNetWins] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchActiveSessions();
    fetchTiers();
  }, []);

  const fetchActiveSessions = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/sessions?status=active');
      const data = await response.json();
      
      if (data.sessions) {
        setSessions(data.sessions);
      }
    } catch (err) {
      setError('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const fetchTiers = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/ladder-tiers');
      const data = await response.json();
      if (data.tiers) {
        setTiers(data.tiers);
      }
    } catch (err) {
      // Silent fail
    }
  };

  const handleJoinClick = async () => {
    if (!selectedSession) return;

    const session = sessions.find(s => s.id === parseInt(selectedSession));
    
    if (session?.game_mode === 'ladder') {
      // Check if user already joined this session
      try {
        const { data: { session: authSession } } = await supabase.auth.getSession();
        const response = await fetch(`http://localhost:3001/api/sessions/${selectedSession}/participant-check`, {
          headers: {
            'Authorization': `Bearer ${authSession?.access_token}`
          }
        });
        const data = await response.json();
        
        if (data.isParticipant) {
          // Already joined, go directly to session
          navigate(`/session/${selectedSession}`);
        } else {
          // First time, show modal
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

      // Navigate to DuelRecords for this session
      navigate(`/session/${selectedSession}`);
    } catch (err) {
      setError(err.message || 'Failed to join session');
    } finally {
      setJoining(false);
      setShowLadderModal(false);
    }
  };

  if (loading) {
    return <div className="active-session">Loading sessions...</div>;
  }

  return (
    <div className="active-session">
      {error && <div className="message error-message">{error}</div>}
      {success && <div className="message success-message">{success}</div>}

      <div className="form-group">
        <label htmlFor="session">Select a session</label>
        <select
          id="session"
          value={selectedSession}
          onChange={(e) => setSelectedSession(e.target.value)}
        >
          <option value="">Choose a session...</option>
          {sessions.map((session) => (
            <option key={session.id} value={session.id}>
              {session.name} ({session.game_mode})
            </option>
          ))}
        </select>
      </div>

      <button
        className="join-btn"
        onClick={handleJoinClick}
        disabled={!selectedSession || joining}
      >
        {joining ? 'Joining...' : 'Join'}
      </button>

      {showLadderModal && (
        <div className="modal-overlay" onClick={() => setShowLadderModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Ladder Session Setup</h3>
            <p>Enter your starting rank information</p>
            
            <div className="form-group">
              <label htmlFor="initialTier">Initial Tier</label>
              <select
                id="initialTier"
                value={initialTier}
                onChange={(e) => setInitialTier(e.target.value)}
              >
                <option value="">Select tier...</option>
                {tiers.map((tier) => (
                  <option key={tier.id} value={tier.id}>
                    {tier.tier_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="netWins">Net Wins in Tier</label>
              <select
                id="netWins"
                value={initialNetWins}
                onChange={(e) => setInitialNetWins(parseInt(e.target.value))}
                disabled={!initialTier}
              >
                {initialTier && Array.from(
                  { length: (tiers.find(t => t.id === parseInt(initialTier))?.wins_required || 5) + 1 },
                  (_, i) => i
                ).map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
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
