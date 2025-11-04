import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import './DuelHistory.css';

export default function DuelHistory({ sessionId, onDuelDeleted }) {
  const [duels, setDuels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (sessionId) fetchDuels();
  }, [sessionId]);

  const fetchDuels = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`http://localhost:3001/api/sessions/${sessionId}/duels`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch duels');
      const data = await response.json();
      setDuels(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (duelId) => {
    if (!window.confirm('Are you sure you want to delete this duel?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`http://localhost:3001/api/duels/${duelId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (!response.ok) throw new Error('Failed to delete duel');
      setDuels(prev => prev.filter(d => d.id !== duelId));
      
      // Refresh parent component stats
      if (onDuelDeleted) onDuelDeleted();
    } catch (err) {
      setError(err.message);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toISOString().split('T')[0];
  };

  if (loading) {
    return (
      <div className="duel-history-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading duel history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="duel-history-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="duel-history-container">
      <div className="duel-table-wrapper">
        <table className="duel-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th>Your Deck</th>
              <th>Opp Deck</th>
              <th>Coin</th>
              <th>Turn</th>
              <th>Result</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {duels.length === 0 ? (
              <tr>
                <td colSpan="9" className="no-duels">No duels recorded yet</td>
              </tr>
            ) : (
              duels.map((duel, index) => (
                <tr key={duel.id}>
                  <td>{duels.length - index}</td>
                  <td>{formatDate(duel.created_at)}</td>
                  <td>{duel.player_deck_name}</td>
                  <td>{duel.opponent_deck_name}</td>
                  <td>{duel.coin_flip_winner === 'player' ? '1st' : '2nd'}</td>
                  <td>{duel.first_turn === 'player' ? '1st' : '2nd'}</td>
                  <td className={`result ${duel.result.toLowerCase()}`}>
                    {duel.result.toUpperCase()}
                  </td>
                  <td>{duel.rating_after || '—'}</td>
                  <td>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(duel.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
