import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase, db } from '../../../../lib/supabase';
import './DuelHistory.css';

export default function DuelHistory({ sessionId, onDuelDeleted, isArchived = false }) {
  const { t } = useTranslation('duelRecords');
  const [duels, setDuels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const subscriptionRef = useRef(null);

  useEffect(() => {
    if (sessionId) {
      fetchDuels();
      if (!isArchived) setupRealtimeDuels();
    }

    return () => {
      if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current);
    };
  }, [sessionId, isArchived]);

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

  const setupRealtimeDuels = () => {
    subscriptionRef.current = db.subscribeToDuels(
      sessionId,
      (newDuel) => setDuels((prev) => [newDuel, ...prev]),
      (updatedDuel) => setDuels((prev) => prev.map((d) => (d.id === updatedDuel.id ? updatedDuel : d))),
      (deletedDuel) => {
        setDuels((prev) => prev.filter((d) => d.id !== deletedDuel.id));
        onDuelDeleted?.();
      }
    );
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
              <th>{t('duelHistory.date')}</th>
              <th>{t('duelHistory.yourDeck')}</th>
              <th>{t('duelHistory.oppDeck')}</th>
              <th>{t('duelHistory.coin')}</th>
              <th>{t('duelHistory.turn')}</th>
              <th>{t('duelHistory.result')}</th>
              <th>{t('duelHistory.total')}</th>
              {!isArchived && <th></th>}
            </tr>
          </thead>
          <tbody>
            {duels.length === 0 ? (
              <tr>
                <td colSpan="9" className="no-duels">{t('duelHistory.noDuels')}</td>
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
                  {!isArchived && (
                    <td>
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(duel.id)}
                      >
                        {t('common:common.delete')}
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
