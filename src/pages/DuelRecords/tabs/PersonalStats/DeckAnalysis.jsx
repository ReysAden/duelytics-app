import './DeckAnalysis.css';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useSessionData } from '../../../../contexts/SessionDataContext';
import { useArchiveSessionData } from '../../../../contexts/ArchiveSessionDataContext';
import { API_URL } from '../../../../config/api';

function DeckAnalysis({ sessionId, dateFilter, targetUserId = null }) {
  const [targetData, setTargetData] = useState([]);
  const [targetLoading, setTargetLoading] = useState(false);
  
  // Try archive context first, fallback to active session context
  let contextData;
  try {
    contextData = useArchiveSessionData();
  } catch {
    contextData = useSessionData();
  }
  const { personalDeckAnalysis: contextDecks, loading: contextLoading } = contextData;
  
  // Fetch target user data if browsing another user
  useEffect(() => {
    if (targetUserId) {
      fetchTargetUserData();
    }
  }, [targetUserId, sessionId, dateFilter]);
  
  const fetchTargetUserData = async () => {
    setTargetLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      let url = `${API_URL}/sessions/${sessionId}/deck-analysis`;
      const params = new URLSearchParams();
      if (dateFilter !== 'all') params.append('days', dateFilter);
      if (targetUserId) params.append('userId', targetUserId);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const result = await response.json();
      if (result.decks) {
        setTargetData(result.decks);
      }
    } catch (err) {
      console.error('Failed to load target user deck analysis:', err);
    } finally {
      setTargetLoading(false);
    }
  };
  
  const decks = targetUserId ? targetData : contextDecks;
  const loading = targetUserId ? targetLoading : contextLoading;

  // Memoize color calculation to avoid repeated lookups
  const getWinRateColor = useCallback((winRate) => {
    if (winRate >= 60) return '#4ade80';
    if (winRate >= 40) return '#fbbf24';
    return '#f87171';
  }, []);

  if (loading) return <div className="deck-analysis-loading">Loading...</div>;
  if (decks.length === 0) return <div className="no-data">No deck data yet</div>;

  return (
    <div className="deck-analysis-container">
      <div className="deck-grid">
        {decks.map((deck) => (
          <div 
            key={deck.id} 
            className="deck-card-analysis"
            style={{ backgroundImage: `url(${deck.image_url})` }}
          >
            <div className="deck-overlay-analysis">
              <div className="deck-stats-top">
                <div className="deck-winrate" style={{ color: getWinRateColor(deck.winRate) }}>
                  {deck.winRate.toFixed(1)}%
                </div>
                <div className="deck-stats-row">
                  <span className="deck-games">{deck.games} games</span>
                </div>
                <div className="deck-record">
                  <span className="deck-wins">{deck.wins}W</span>
                  <span> - </span>
                  <span className="deck-losses">{deck.losses}L</span>
                </div>
              </div>
              <div className="deck-card-name">{deck.name}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DeckAnalysis;
