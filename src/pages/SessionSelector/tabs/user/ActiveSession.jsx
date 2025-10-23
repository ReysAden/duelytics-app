import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import './ActiveSession.css';

function ActiveSession() {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchActiveSessions();
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

      const response = await fetch('http://localhost:3001/api/sessions/join', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: selectedSession
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join session');
      }

      setSuccess('Joined!');
      setSelectedSession('');
    } catch (err) {
      setError(err.message || 'Failed to join session');
    } finally {
      setJoining(false);
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
        onClick={handleJoinSession}
        disabled={!selectedSession || joining}
      >
        {joining ? 'Joining...' : 'Join'}
      </button>
    </div>
  );
}

export default ActiveSession;
