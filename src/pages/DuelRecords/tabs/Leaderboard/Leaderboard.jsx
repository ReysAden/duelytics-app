import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../../../lib/supabase';
import './Leaderboard.css';

function Leaderboard() {
  const { sessionId } = useParams();
  const [leaderboard, setLeaderboard] = useState([]);
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      fetchSession();
      fetchLeaderboard();
    }
  }, [sessionId]);

  const fetchSession = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/sessions/${sessionId}`);
      const data = await response.json();
      if (data.session) {
        setSessionData(data.session);
      }
    } catch (err) {
      console.error('Failed to load session:', err);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`http://localhost:3001/api/sessions/${sessionId}/leaderboard`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      
      const data = await response.json();
      if (data.leaderboard) {
        setLeaderboard(data.leaderboard);
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tierName) => {
    if (!tierName) return '#ffffff';
    const tier = tierName.toLowerCase();
    if (tier.includes('rookie')) return '#4ade80';
    if (tier.includes('bronze')) return '#cd7f32';
    if (tier.includes('silver')) return '#c0c0c0';
    if (tier.includes('gold')) return '#ffd700';
    if (tier.includes('platinum')) return '#87ceeb';
    if (tier.includes('diamond')) return '#b19cd9';
    if (tier.includes('master')) return '#ff8c00';
    return '#ffffff';
  };

  if (loading) {
    return (
      <div className="leaderboard-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="leaderboard-container">
        <div className="no-data">No players yet</div>
      </div>
    );
  }

  const isLadder = sessionData?.game_mode === 'ladder';

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-wrapper">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th className="rank-col">#</th>
              <th className="username-col">Player</th>
              <th className="points-col">{isLadder ? 'Rank' : 'Points'}</th>
              <th className="games-col">Games</th>
              <th className="deck-col">Top Deck</th>
              <th className="winrate-col">Overall</th>
              <th className="winrate-col">1st</th>
              <th className="winrate-col">2nd</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((player, index) => (
              <tr key={player.user_id}>
                <td className="rank-cell">{index + 1}</td>
                <td className="username-cell">{player.username}</td>
                <td className="points-cell">
                  {isLadder ? (
                    <span style={{ color: getTierColor(player.tier_name) }}>
                      {player.tier_name || 'Unranked'}
                    </span>
                  ) : (
                    sessionData?.game_mode === 'rated' 
                      ? player.points.toFixed(2)
                      : Math.round(player.points)
                  )}
                </td>
                <td className="games-cell">{player.total_games}</td>
                <td className="deck-cell">
                  {player.top_deck ? (
                    <div className="deck-info">
                      <img src={player.top_deck_image} alt={player.top_deck} className="deck-thumb" />
                      <span className="deck-name">{player.top_deck}</span>
                    </div>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="winrate-cell">{player.overall_winrate.toFixed(1)}%</td>
                <td className="winrate-cell">{player.first_winrate.toFixed(1)}%</td>
                <td className="winrate-cell">{player.second_winrate.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Leaderboard;
