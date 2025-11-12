import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ArchiveSession.css';

function ArchiveSession() {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchArchivedSessions();
  }, []);

  const fetchArchivedSessions = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/sessions?status=archived');
      const data = await response.json();
      
      if (data.sessions) {
        setSessions(data.sessions);
      }
    } catch (err) {
      setError('Failed to load archived sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleViewSession = () => {
    if (!selectedSession) return;
    navigate(`/session/${selectedSession}`);
  };

  if (loading) {
    return <div className="archive-session">Loading archived sessions...</div>;
  }

  return (
    <div className="archive-session">
      {error && <div className="message error-message">{error}</div>}

      <div className="form-group">
        <label htmlFor="session">Select an archived session</label>
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
        className="view-btn"
        onClick={handleViewSession}
        disabled={!selectedSession}
      >
        View
      </button>

      {sessions.length === 0 && !loading && (
        <p style={{ color: 'rgba(255, 255, 255, 0.5)', marginTop: '20px' }}>
          No archived sessions found
        </p>
      )}
    </div>
  );
}

export default ArchiveSession;
