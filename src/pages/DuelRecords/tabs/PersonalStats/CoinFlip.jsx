import './CoinFlip.css';
import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { API_URL } from '../../../../config/api';

function CoinFlip({ sessionId, dateFilter, targetUserId = null }) {
  const [stats, setStats] = useState({
    totalFlips: 0,
    flipsWon: 0,
    flipsLost: 0,
    wonCoinWinRate: 0,
    wonCoinGames: 0,
    wonCoinWins: 0,
    lostCoinWinRate: 0,
    lostCoinGames: 0,
    lostCoinWins: 0,
    expected: 0,
    actual: 0,
    deviation: 0,
    stdDev: 0,
    lastTenFlips: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCoinFlipStats();
  }, [sessionId, dateFilter, targetUserId]);

  const fetchCoinFlipStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let url = `${API_URL}/sessions/${sessionId}/coin-flip`;
      const params = new URLSearchParams();
      if (dateFilter !== 'all') params.append('days', dateFilter);
      if (targetUserId) params.append('userId', targetUserId);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      
      const data = await response.json();
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to load coin flip stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="coinflip-loading">Loading...</div>;

  return (
    <div className="coinflip-container">
      <div className="section-title">Coin Flip Results</div>
      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-card-label">Coin Flips Won</div>
          <div className="stat-card-value">
            {stats.totalFlips > 0 ? ((stats.flipsWon / stats.totalFlips) * 100).toFixed(1) : 0}%
          </div>
          <div className="stat-card-subtitle">({stats.flipsWon} / {stats.totalFlips})</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Coin Flips Lost</div>
          <div className="stat-card-value">
            {stats.totalFlips > 0 ? ((stats.flipsLost / stats.totalFlips) * 100).toFixed(1) : 0}%
          </div>
          <div className="stat-card-subtitle">({stats.flipsLost} / {stats.totalFlips})</div>
        </div>
      </div>

      <div className="section-title">Win Rate by Coin Result</div>
      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-card-label">Won Coin Flip</div>
          <div className="stat-card-value">{stats.wonCoinWinRate.toFixed(1)}%</div>
          <div className="stat-card-subtitle">{stats.wonCoinWins}W - {stats.wonCoinGames - stats.wonCoinWins}L</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Lost Coin Flip</div>
          <div className="stat-card-value">{stats.lostCoinWinRate.toFixed(1)}%</div>
          <div className="stat-card-subtitle">{stats.lostCoinWins}W - {stats.lostCoinGames - stats.lostCoinWins}L</div>
        </div>
      </div>

      <div className="section-title">Statistical Analysis</div>
      <div className="stats-analysis">
        <div className="analysis-row">
          <span className="analysis-label">Expected:</span>
          <span className="analysis-value">{stats.expected.toFixed(1)} wins (50%)</span>
        </div>
        <div className="analysis-row">
          <span className="analysis-label">Actual:</span>
          <span className="analysis-value">{stats.actual} wins ({stats.totalFlips > 0 ? ((stats.actual / stats.totalFlips) * 100).toFixed(1) : 0}%)</span>
        </div>
        <div className="analysis-row">
          <span className="analysis-label">Deviation:</span>
          <span className="analysis-value" style={{ color: stats.deviation >= 0 ? '#4ade80' : '#f87171' }}>
            {stats.deviation >= 0 ? '+' : ''}{stats.deviation.toFixed(1)} flips ({stats.deviation >= 0 ? '+' : ''}{stats.expected > 0 ? ((stats.deviation / stats.expected) * 100).toFixed(1) : 0}%)
          </span>
        </div>
        <div className="analysis-row">
          <span className="analysis-label">σ:</span>
          <span className="analysis-value">±{stats.stdDev.toFixed(1)} flips</span>
        </div>
      </div>

      <div className="section-title">Last 10 Coin Flips</div>
      <div className="flip-history">
        {stats.lastTenFlips.length > 0 ? (
          <div className="flip-row">
            {stats.lastTenFlips.map((flip, index) => (
              <div key={index} className="flip-item">
                <div className={`flip-circle ${flip.duelWon ? 'win' : 'loss'}`}></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-data">No coin flip data yet</div>
        )}
      </div>
    </div>
  );
}

export default CoinFlip;
