import './Overview.css';
import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';

function Overview({ sessionId, dateFilter, targetUserId = null }) {
  const [stats, setStats] = useState({
    totalGames: 0,
    winRate: 0,
    firstWinRate: 0,
    firstGames: 0,
    secondWinRate: 0,
    secondGames: 0,
    bestDeck: { name: '-', winRate: 0, games: 0 },
    worstDeck: { name: '-', winRate: 0, games: 0 },
    mostFaced: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverviewStats();
  }, [sessionId, dateFilter, targetUserId]);

  const fetchOverviewStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let url = `http://localhost:3001/api/sessions/${sessionId}/overview`;
      const params = new URLSearchParams();
      if (dateFilter !== 'all') params.append('days', dateFilter);
      if (targetUserId) params.append('userId', targetUserId);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      
      const data = await response.json();
      if (data.overview) {
        setStats(data.overview);
      }
    } catch (err) {
      console.error('Failed to load overview:', err);
    } finally {
      setLoading(false);
    }
  };

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
