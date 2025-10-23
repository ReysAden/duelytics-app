import { useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import './CreateNewSession.css';

function CreateNewSession() {
  const [sessionName, setSessionName] = useState('');
  const [gameMode, setGameMode] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      // Convert game mode to match backend format
      const gameModeMap = {
        'Duelist Cup': 'duelist_cup',
        'Rated': 'rated',
        'Ladder': 'ladder'
      };

      // Validate dates
      if (!startTime || !endTime) {
        setError('Please select both start and end times');
        return;
      }

      // Convert datetime-local format to ISO timestamp
      const startsAt = new Date(startTime).toISOString();
      const endsAt = new Date(endTime).toISOString();

      const requestBody = {
        name: sessionName,
        game_mode: gameModeMap[gameMode],
        starts_at: startsAt,
        ends_at: endsAt
      };

      // Create session via backend
      const response = await fetch('http://localhost:3001/api/admin/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create session');
      }

      setSuccess('Created!');
      // Reset form
      setSessionName('');
      setGameMode('');
      setStartTime('');
      setEndTime('');
    } catch (err) {
      setError(err.message || 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-session-form">
      {error && <div className="message error-message">{error}</div>}
      {success && <div className="message success-message">{success}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="sessionName">Session Name</label>
          <input
            type="text"
            id="sessionName"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            placeholder="Enter session name"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="gameMode">Game Mode</label>
          <select
            id="gameMode"
            value={gameMode}
            onChange={(e) => setGameMode(e.target.value)}
            required
          >
            <option value="">Select game mode</option>
            <option value="Duelist Cup">Duelist Cup</option>
            <option value="Rated">Rated</option>
            <option value="Ladder">Ladder</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="startTime">Start Time</label>
          <input
            type="datetime-local"
            id="startTime"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="endTime">End Time</label>
          <input
            type="datetime-local"
            id="endTime"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? 'Creating...' : 'Create Session'}
        </button>
      </form>
    </div>
  );
}

export default CreateNewSession;
