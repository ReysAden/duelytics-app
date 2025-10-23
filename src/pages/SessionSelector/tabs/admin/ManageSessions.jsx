import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import './ManageSessions.css';

function ManageSessions() {
  const [activeSessions, setActiveSessions] = useState([]);
  const [archivedSessions, setArchivedSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(''); // 'active' or 'archived'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const [activeRes, archivedRes] = await Promise.all([
        fetch('http://localhost:3001/api/sessions?status=active'),
        fetch('http://localhost:3001/api/sessions?status=archived')
      ]);
      
      const activeData = await activeRes.json();
      const archivedData = await archivedRes.json();
      
      if (activeData.sessions) setActiveSessions(activeData.sessions);
      if (archivedData.sessions) setArchivedSessions(archivedData.sessions);
    } catch (err) {
      setError('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!selectedSession) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch(`http://localhost:3001/api/admin/sessions/${selectedSession}/archive`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to archive session');
      }

      setSuccess('Archived!');
      setSelectedSession('');
      setSelectedStatus('');
      fetchSessions(); // Refresh list
    } catch (err) {
      setError(err.message || 'Failed to archive session');
    }
  };

  const handleDelete = async () => {
    if (!selectedSession) return;

    if (!confirm('Are you sure you want to delete this session? This cannot be undone.')) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch(`http://localhost:3001/api/admin/sessions/${selectedSession}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete session');
      }

      setSuccess('Deleted!');
      setSelectedSession('');
      setSelectedStatus('');
      fetchSessions(); // Refresh list
    } catch (err) {
      setError(err.message || 'Failed to delete session');
    }
  };

  if (loading) {
    return <div className="manage-sessions">Loading sessions...</div>;
  }

  return (
    <div className="manage-sessions">
      {error && <div className="message error-message">{error}</div>}
      {success && <div className="message success-message">{success}</div>}

      <div className="form-group">
        <label htmlFor="session">Select a session</label>
        <select
          id="session"
          value={selectedSession}
          onChange={(e) => {
            const [sessionId, status] = e.target.value.split('|');
            setSelectedSession(sessionId);
            setSelectedStatus(status);
          }}
        >
          <option value="">Choose a session...</option>
          
          {activeSessions.length > 0 && (
            <optgroup label="Active Sessions">
              {activeSessions.map((session) => (
                <option key={session.id} value={`${session.id}|active`}>
                  {session.name} ({session.game_mode})
                </option>
              ))}
            </optgroup>
          )}
          
          {archivedSessions.length > 0 && (
            <optgroup label="Archived Sessions">
              {archivedSessions.map((session) => (
                <option key={session.id} value={`${session.id}|archived`}>
                  {session.name} ({session.game_mode})
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      {selectedSession && (
        <div className="action-modal">
          {selectedStatus === 'active' && (
            <button className="action-btn archive-btn" onClick={handleArchive}>
              Archive
            </button>
          )}
          <button className="action-btn delete-btn" onClick={handleDelete}>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default ManageSessions;
