import './DuelRecords.css';
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Submit from './tabs/Submit';
import PersonalStats from './tabs/PersonalStats/PersonalStats';
import DuelHistory from './tabs/DuelHistory/DuelHistory';
import DeckWinrates from './tabs/DeckWinrates/DeckWinrates';
import MatchupMatrix from './tabs/MatchupMatrix/MatchupMatrix';
import Leaderboard from './tabs/Leaderboard/Leaderboard';

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

function DuelRecords() {
  const { sessionId } = useParams();
  const [activeTab, setActiveTab] = useState('Submit');
  const [sessionData, setSessionData] = useState(null);
  const [userStats, setUserStats] = useState({
    points: 0,
    wins: 0,
    losses: 0,
    tier: null,
    netWins: 0,
    winsRequired: 5
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionId) {
      fetchSessionData();
      fetchUserStats();
    }
  }, [sessionId]);

  const fetchSessionData = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/sessions/${sessionId}`);
      const data = await response.json();
      
      if (data.session) {
        setSessionData({
          name: data.session.name,
          gameMode: data.session.game_mode
        });
      }
    } catch (err) {
      console.error('Failed to load session:', err);
      setSessionData({
        name: 'Unknown Session',
        gameMode: ''
      });
    }
  };

  const fetchUserStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`http://localhost:3001/api/sessions/${sessionId}/stats`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      const data = await response.json();
      console.log('Stats response:', data);
      
      if (data.stats) {
        const newStats = {
          points: data.stats.current_points || 0,
          wins: data.stats.total_wins || 0,
          losses: (data.stats.total_games || 0) - (data.stats.total_wins || 0),
          tier: data.stats.ladder_tiers?.tier_name || null,
          netWins: data.stats.current_net_wins || 0,
          winsRequired: data.stats.ladder_tiers?.wins_required || 5
        };
        console.log('Setting user stats:', newStats);
        setUserStats(newStats);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleBackToLobby = () => {
    navigate('/');
  };

  return (
    <>
      <aside className="sidebar">
        <h1 className="sidebar-title">Duelytics</h1>
        <div className="sidebar-divider"></div>
        <p className="sidebar-session-name">
          {sessionData?.name || 'Session Name'}
        </p>
        
        <div className="sidebar-stats">
          {sessionData?.gameMode === 'ladder' ? (
            <>
              <div className="stat-item">
                <span className="stat-label">Rank</span>
                <span className="stat-value" style={{ color: getTierColor(userStats.tier) }}>
                  {userStats.tier || 'Unranked'}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Net Wins</span>
                <span className="stat-value">{userStats.netWins}/{userStats.winsRequired}</span>
              </div>
            </>
          ) : (
            <div className="stat-item">
              <span className="stat-label">Points</span>
              <span className="stat-value">
                {sessionData?.gameMode === 'rated' 
                  ? userStats.points.toFixed(2) 
                  : Math.round(userStats.points)}
              </span>
            </div>
          )}
          <div className="stat-item">
            <span className="stat-label">Record</span>
            <span className="stat-value">
              <span className="record-win">{userStats.wins}W</span>
              <span> - </span>
              <span className="record-loss">{userStats.losses}L</span>
            </span>
          </div>
        </div>
        
        <div className="sidebar-divider"></div>
        
        <nav className="sidebar-nav">
          <button 
            className={`sidebar-item ${activeTab === 'Submit' ? 'active' : ''}`}
            onClick={() => setActiveTab('Submit')}
          >
            Submit
          </button>
          <button 
            className={`sidebar-item ${activeTab === 'Personal Stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('Personal Stats')}
          >
            Personal Stats
          </button>
          <button 
            className={`sidebar-item ${activeTab === 'Deck Winrates' ? 'active' : ''}`}
            onClick={() => setActiveTab('Deck Winrates')}
          >
            Deck Winrates
          </button>
          <button 
            className={`sidebar-item ${activeTab === 'Matchup Matrix' ? 'active' : ''}`}
            onClick={() => setActiveTab('Matchup Matrix')}
          >
            Matchup Matrix
          </button>
          <button 
            className={`sidebar-item ${activeTab === 'Duel History' ? 'active' : ''}`}
            onClick={() => setActiveTab('Duel History')}
          >
            Duel History
          </button>
          <button 
            className={`sidebar-item ${activeTab === 'Leaderboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('Leaderboard')}
          >
            Leaderboard
          </button>
        </nav>
        
        <div className="sidebar-footer">
          <div className="sidebar-divider"></div>
          <button className="back-btn" onClick={handleBackToLobby}>
            Back to Lobby
          </button>
        </div>
      </aside>
      
      <main className="main-content">
        {activeTab === 'Personal Stats' ? (
          <PersonalStats sessionData={sessionData} />
        ) : activeTab === 'Duel History' ? (
          <DuelHistory sessionId={sessionId} onDuelDeleted={fetchUserStats} />
        ) : activeTab === 'Deck Winrates' ? (
          <div className="content-body">
            <DeckWinrates />
          </div>
        ) : activeTab === 'Matchup Matrix' ? (
          <MatchupMatrix />
        ) : activeTab === 'Leaderboard' ? (
          <Leaderboard />
        ) : (
          <>
            {activeTab !== 'Submit' && (
              <header className="content-header">
                <h1 className="content-title">{activeTab}</h1>
              </header>
            )}
            <div className="content-body">
              {activeTab === 'Submit' && <Submit onDuelSubmitted={fetchUserStats} />}
            </div>
          </>
        )}
      </main>
    </>
  );
}

export default DuelRecords;
