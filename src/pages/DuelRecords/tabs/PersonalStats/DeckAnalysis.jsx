import './DeckAnalysis.css';
import { useSessionData } from '../../../../contexts/SessionDataContext';
import { useArchiveSessionData } from '../../../../contexts/ArchiveSessionDataContext';
import { useCallback } from 'react';

function DeckAnalysis({ sessionId, dateFilter, targetUserId = null }) {
  // Try archive context first, fallback to active session context
  let contextData;
  try {
    contextData = useArchiveSessionData();
  } catch {
    contextData = useSessionData();
  }
  const { personalDeckAnalysis: decks, loading } = contextData;

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
