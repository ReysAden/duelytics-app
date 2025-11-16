import './DuelRecords.css';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase, db } from '../../lib/supabase';
import Submit from './tabs/Submit';
import Browse from './tabs/Browse';
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
  const { t } = useTranslation(['common', 'duelRecords']);
  const { sessionId } = useParams();
  const [sessionData, setSessionData] = useState(null);
  const [activeTab, setActiveTab] = useState(sessionData?.status === 'archived' ? 'Browse' : 'Submit');
  const [userStats, setUserStats] = useState({
    points: 0,
    wins: 0,
    losses: 0,
    tier: null,
    netWins: 0,
    winsRequired: 5
  });
  const navigate = useNavigate();
  const subscriptionsRef = useRef([]);

  useEffect(() => {
    if (sessionId) {
      fetchSessionData();
      fetchUserStats();
      setupRealtimeSubscriptions();
    }

    return () => {
      subscriptionsRef.current.forEach((channel) => supabase.removeChannel(channel));
      subscriptionsRef.current = [];
    };
  }, [sessionId]);

  const fetchSessionData = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/sessions/${sessionId}`);
      const data = await response.json();
      
      if (data.session) {
        const session = {
          name: data.session.name,
          gameMode: data.session.game_mode,
          status: data.session.status
        };
        setSessionData(session);
        // Set initial tab based on session status
        if (data.session.status === 'archived') {
          setActiveTab('Browse');
        }
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
      
      if (data.stats) {
        setUserStats({
          points: data.stats.current_points || 0,
          wins: data.stats.total_wins || 0,
          losses: (data.stats.total_games || 0) - (data.stats.total_wins || 0),
          tier: data.stats.ladder_tiers?.tier_name || null,
          netWins: data.stats.current_net_wins || 0,
          winsRequired: data.stats.ladder_tiers?.wins_required || 5
        });
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const setupRealtimeSubscriptions = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const currentUserId = session.user.user_metadata?.discord_id;
    const statsChannel = db.subscribeToPlayerStats(sessionId, (updatedStats) => {
      if (updatedStats.user_id === currentUserId) {
        setUserStats({
          points: updatedStats.current_points || 0,
          wins: updatedStats.total_wins || 0,
          losses: (updatedStats.total_games || 0) - (updatedStats.total_wins || 0),
          tier: updatedStats.ladder_tiers?.tier_name || null,
          netWins: updatedStats.current_net_wins || 0,
          winsRequired: updatedStats.ladder_tiers?.wins_required || 5
        });
      }
    });

    subscriptionsRef.current.push(statsChannel);
  };

  const handleBackToLobby = () => {
    navigate('/');
  };

  return (
    <>
      <aside className="sidebar">
        <h1 className="sidebar-title">{t('common:app.name')}</h1>
        <div className="sidebar-divider"></div>
        <p className="sidebar-session-name">
          {sessionData?.name || 'Session Name'}
        </p>
        
        <div className="sidebar-stats">
          {sessionData?.gameMode === 'ladder' ? (
            <>
              <div className="stat-item">
                <span className="stat-label">{t('common:stats.rank')}</span>
                <span className="stat-value" style={{ color: getTierColor(userStats.tier) }}>
                  {userStats.tier || t('common:stats.unranked')}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">{t('common:stats.netWins')}</span>
                <span className="stat-value">{userStats.netWins}/{userStats.winsRequired}</span>
              </div>
            </>
          ) : (
            <div className="stat-item">
              <span className="stat-label">{t('common:stats.points')}</span>
              <span className="stat-value">
                {sessionData?.gameMode === 'rated' 
                  ? userStats.points.toFixed(2) 
                  : Math.round(userStats.points)}
              </span>
            </div>
          )}
          <div className="stat-item">
            <span className="stat-label">{t('common:stats.record')}</span>
            <span className="stat-value">
              <span className="record-win">{userStats.wins}{t('common:common.win')}</span>
              <span> - </span>
              <span className="record-loss">{userStats.losses}{t('common:common.loss')}</span>
            </span>
          </div>
        </div>
        
        <div className="sidebar-divider"></div>
        
        <nav className="sidebar-nav">
          {sessionData?.status !== 'archived' ? (
            <button 
              className={`sidebar-item ${activeTab === 'Submit' ? 'active' : ''}`}
              onClick={() => setActiveTab('Submit')}
            >
              {t('duelRecords:tabs.submit')}
            </button>
          ) : (
            <button 
              className={`sidebar-item ${activeTab === 'Browse' ? 'active' : ''}`}
              onClick={() => setActiveTab('Browse')}
            >
              {t('duelRecords:tabs.browse')}
            </button>
          )}
          <button 
            className={`sidebar-item ${activeTab === 'Personal Stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('Personal Stats')}
          >
            {t('duelRecords:tabs.personalStats')}
          </button>
          <button 
            className={`sidebar-item ${activeTab === 'Deck Winrates' ? 'active' : ''}`}
            onClick={() => setActiveTab('Deck Winrates')}
          >
            {t('duelRecords:tabs.deckWinrates')}
          </button>
          <button 
            className={`sidebar-item ${activeTab === 'Matchup Matrix' ? 'active' : ''}`}
            onClick={() => setActiveTab('Matchup Matrix')}
          >
            {t('duelRecords:tabs.matchupMatrix')}
          </button>
          <button 
            className={`sidebar-item ${activeTab === 'Duel History' ? 'active' : ''}`}
            onClick={() => setActiveTab('Duel History')}
          >
            {t('duelRecords:tabs.duelHistory')}
          </button>
          <button 
            className={`sidebar-item ${activeTab === 'Leaderboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('Leaderboard')}
          >
            {t('duelRecords:tabs.leaderboard')}
          </button>
        </nav>
        
        <div className="sidebar-footer">
          <div className="sidebar-divider"></div>
          <button className="back-btn" onClick={handleBackToLobby}>
            {t('common:sidebar.backToLobby')}
          </button>
        </div>
      </aside>
      
      <main className="main-content">
        {activeTab === 'Personal Stats' ? (
          <PersonalStats sessionData={sessionData} />
        ) : activeTab === 'Duel History' ? (
          <DuelHistory sessionId={sessionId} onDuelDeleted={fetchUserStats} isArchived={sessionData?.status === 'archived'} />
        ) : activeTab === 'Deck Winrates' ? (
          <div className="content-body">
            <DeckWinrates />
          </div>
        ) : activeTab === 'Matchup Matrix' ? (
          <MatchupMatrix />
        ) : activeTab === 'Leaderboard' ? (
          <Leaderboard />
        ) : activeTab === 'Browse' ? (
          <div className="content-body">
            <Browse sessionData={sessionData} />
          </div>
        ) : (
          <>
            {activeTab !== 'Submit' && activeTab !== 'Browse' && (
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
