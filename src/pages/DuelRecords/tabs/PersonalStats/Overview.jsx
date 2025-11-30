import './Overview.css';
import { useSessionData } from '../../../../contexts/SessionDataContext';
import { useArchiveSessionData } from '../../../../contexts/ArchiveSessionDataContext';

function Overview({ sessionId, dateFilter, targetUserId = null }) {
  // Try archive context first, fallback to active session context
  let contextData;
  try {
    contextData = useArchiveSessionData();
  } catch {
    contextData = useSessionData();
  }
  const { personalOverview, loading } = contextData;
  
  // Default stats if no data yet
  const stats = personalOverview || {
    totalGames: 0,
    winRate: 0,
    firstWinRate: 0,
    firstGames: 0,
    secondWinRate: 0,
    secondGames: 0,
    bestDeck: { name: '-', winRate: 0, games: 0 },
    worstDeck: { name: '-', winRate: 0, games: 0 },
    mostFaced: []
  };

  // Data is now pre-fetched and cached in SessionDataContext
  // No need for component-level fetching!

  if (loading) return <div className="overview-loading">Loading...</div>;

  return (
    <div className="overview-container">
      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-card-label">Total Games</div>
          <div className="stat-card-value">{stats.totalGames}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Win Rate</div>
          <div className="stat-card-value">{stats.winRate.toFixed(1)}%</div>
        </div>
      </div>

      <div className="section-title">Win Rate by Turn Order</div>
      <div className="stat-row">
        <div className="stat-card">
          <div className="turn-header">
            <img src="/first.svg" alt="First" className="turn-icon" />
            <span>Going First</span>
          </div>
          <div className="stat-card-value">{stats.firstWinRate.toFixed(1)}%</div>
          <div className="stat-card-subtitle">({stats.firstGames} games)</div>
        </div>
        <div className="stat-card">
          <div className="turn-header">
            <img src="/second.svg" alt="Second" className="turn-icon" />
            <span>Going Second</span>
          </div>
          <div className="stat-card-value">{stats.secondWinRate.toFixed(1)}%</div>
          <div className="stat-card-subtitle">({stats.secondGames} games)</div>
        </div>
      </div>

      <div className="section-title">Deck Performance</div>
      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-card-label">Best Deck</div>
          <div className="deck-name">{stats.bestDeck.name}</div>
          <div className="deck-stats">
            {stats.bestDeck.winRate.toFixed(1)}% ({stats.bestDeck.games} games)
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Worst Deck</div>
          <div className="deck-name">{stats.worstDeck.name}</div>
          <div className="deck-stats">
            {stats.worstDeck.winRate.toFixed(1)}% ({stats.worstDeck.games} games)
          </div>
        </div>
      </div>

      <div className="section-title">Most Faced Decks</div>
      <div className="faced-decks">
        {stats.mostFaced.length > 0 ? (
          stats.mostFaced.map((deck, index) => (
            <div key={index} className="faced-deck-item">
              <span className="faced-deck-rank">{index + 1}.</span>
              <span className="faced-deck-name">{deck.name}</span>
              <span className="faced-deck-count">{deck.games} games</span>
            </div>
          ))
        ) : (
          <div className="no-data">No data yet</div>
        )}
      </div>
    </div>
  );
}

export default Overview;
