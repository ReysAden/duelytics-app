import './DeckWinrates.css';
import { useSessionData } from '../../../../contexts/SessionDataContext';
import { useArchiveSessionData } from '../../../../contexts/ArchiveSessionDataContext';
import { useCallback } from 'react';

function DeckWinrates() {
  // Try archive context first, fallback to active session context
  let contextData;
  try {
    contextData = useArchiveSessionData();
  } catch {
    contextData = useSessionData();
  }
  const { deckWinrates, loading } = contextData;

  // Memoize color calculation to avoid repeated lookups
  const getWinRateColor = useCallback((winRate) => {
    if (winRate >= 60) return '#4ade80';
    if (winRate >= 40) return '#fbbf24';
    return '#f87171';
  }, []);

  if (loading) {
    return (
      <div className="deck-winrates-container">
        <div className="deck-winrates-loading">Loading...</div>
      </div>
    );
  }

  if (!deckWinrates || deckWinrates.length === 0) {
    return (
      <div className="deck-winrates-container">
        <div className="no-data">No deck data yet</div>
      </div>
    );
  }

  return (
    <div className="deck-winrates-container">
      <div className="deck-grid">
        {deckWinrates.map((deck) => (
          <div 
            key={deck.id} 
            className="deck-card"
            style={{ backgroundImage: `url(${deck.image_url})` }}
          >
            <div className="deck-overlay">
              <div className="deck-stats-container">
                <div className="deck-winrate" style={{ color: getWinRateColor(deck.overallWinRate) }}>
                  {deck.overallWinRate.toFixed(1)}%
                </div>
                <div className="deck-stats-row">
                  <span className="deck-games">{deck.totalGames} games</span>
                </div>
                <div className="deck-record">
                  <span className="deck-wins">{deck.wins}W</span>
                  <span> - </span>
                  <span className="deck-losses">{deck.losses}L</span>
                </div>
                <div className="deck-turn-stats">
                  <div className="turn-stat">
                    <img src="./first.svg" alt="First" className="turn-stat-icon" />
                    <span style={{ color: getWinRateColor(deck.firstWinRate) }}>{deck.firstWinRate.toFixed(1)}%</span>
                  </div>
                  <div className="turn-stat">
                    <img src="./second.svg" alt="Second" className="turn-stat-icon" />
                    <span style={{ color: getWinRateColor(deck.secondWinRate) }}>{deck.secondWinRate.toFixed(1)}%</span>
                  </div>
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

export default DeckWinrates;
