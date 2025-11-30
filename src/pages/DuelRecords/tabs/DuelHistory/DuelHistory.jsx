import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../../lib/supabase';
import { useSessionData } from '../../../../contexts/SessionDataContext';
import { useArchiveSessionData } from '../../../../contexts/ArchiveSessionDataContext';
import './DuelHistory.css';

export default function DuelHistory({ sessionId, onDuelDeleted, isArchived = false }) {
  const { t } = useTranslation('duelRecords');
  
  // Try archive context first, fallback to active session context
  let contextData;
  try {
    contextData = useArchiveSessionData();
  } catch {
    contextData = useSessionData();
  }
  const { duels, loading, error } = contextData;

  const handleDelete = useCallback(async (duelId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`http://localhost:3001/api/duels/${duelId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (!response.ok) throw new Error('Failed to delete duel');
      if (onDuelDeleted) onDuelDeleted();
    } catch (err) {
      console.error('Failed to delete duel:', err.message);
    }
  }, [onDuelDeleted]);

  // Memoize date formatting function
  const formatDate = useCallback((dateString) => {
    return new Date(dateString).toISOString().split('T')[0];
  }, []);

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
