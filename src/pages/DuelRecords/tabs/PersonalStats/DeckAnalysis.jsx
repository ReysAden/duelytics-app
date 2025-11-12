import './DeckAnalysis.css';
import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';

function DeckAnalysis({ sessionId, dateFilter, targetUserId = null }) {
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeckStats();
  }, [sessionId, dateFilter, targetUserId]);

  const fetchDeckStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let url = `http://localhost:3001/api/sessions/${sessionId}/deck-analysis`;
      const params = new URLSearchParams();
      if (dateFilter !== 'all') params.append('days', dateFilter);
      if (targetUserId) params.append('userId', targetUserId);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      
      const data = await response.json();
      if (data.decks) {
        setDecks(data.decks);
      }
    } catch (err) {
      console.error('Failed to load deck stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const getWinRateColor = (winRate) => {
    if (winRate >= 60) return '#4ade80';
    if (winRate >= 40) return '#fbbf24';
    return '#f87171';
  };

  if (loading) return <div className="deck-analysis-loading">Loading...</div>;
  if (decks.length === 0) return <div className="no-data">No deck data yet</div>;

  return (
    <div className="deck-analysis-container">
      <div className="deck-grid">
        {decks.map((deck) => (
          <div 
            key={deck.id} 
            className="deck-card"
            style={{ backgroundImage: `url(${deck.image_url})` }}
          >
            <div className="deck-overlay">
              <div className="deck-card-name">{deck.name}</div>
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
          </div>
        ))}
      </div>
    </div>
  );
}

export default DeckAnalysis;
