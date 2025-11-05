import './DeckWinrates.css';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../../../lib/supabase';

function DeckWinrates() {
  const { sessionId } = useParams();
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeckWinrates();
  }, [sessionId]);

  const fetchDeckWinrates = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`http://localhost:3001/api/sessions/${sessionId}/deck-winrates`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      
      const data = await response.json();
      if (data.decks) {
        setDecks(data.decks);
      }
    } catch (err) {
      console.error('Failed to load deck winrates:', err);
    } finally {
      setLoading(false);
    }
  };

  const getWinRateColor = (winRate) => {
    if (winRate >= 60) return '#4ade80';
    if (winRate >= 40) return '#fbbf24';
    return '#f87171';
  };

  if (loading) {
    return (
      <div className="deck-winrates-container">
        <div className="deck-winrates-loading">Loading...</div>
      </div>
    );
  }

  if (decks.length === 0) {
    return (
      <div className="deck-winrates-container">
        <div className="no-data">No deck data yet</div>
      </div>
    );
  }

  return (
    <div className="deck-winrates-container">
      <div className="deck-winrates-grid">
        {decks.map((deck) => (
          <div 
            key={deck.id} 
            className="deck-winrate-card"
            style={{ backgroundImage: `url(${deck.image_url})` }}
          >
            <div className="deck-winrate-overlay">
              <div className="deck-winrate-name">{deck.name}</div>
              
              <div className="winrate-section">
                <div className="winrate-label">Overall</div>
                <div className="winrate-value" style={{ color: getWinRateColor(deck.overallWinRate) }}>
                  {deck.overallWinRate.toFixed(1)}%
                </div>
                <div className="winrate-games">{deck.totalGames} games</div>
              </div>

              <div className="turn-winrates">
                <div className="turn-winrate-item">
                  <img src="/first.svg" alt="First" className="turn-winrate-icon" />
                  <div className="turn-winrate-stats">
                    <div className="turn-winrate-value" style={{ color: getWinRateColor(deck.firstWinRate) }}>
                      {deck.firstWinRate.toFixed(1)}%
                    </div>
                    <div className="turn-winrate-games">{deck.firstGames}g</div>
                  </div>
                </div>

                <div className="turn-winrate-item">
                  <img src="/second.svg" alt="Second" className="turn-winrate-icon" />
                  <div className="turn-winrate-stats">
                    <div className="turn-winrate-value" style={{ color: getWinRateColor(deck.secondWinRate) }}>
                      {deck.secondWinRate.toFixed(1)}%
                    </div>
                    <div className="turn-winrate-games">{deck.secondGames}g</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DeckWinrates;
