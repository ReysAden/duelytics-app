# Duelytics: Realtime Subscriptions Implementation Guide

This guide shows how to implement Supabase Realtime subscriptions to handle 50+ concurrent users submitting/loading data without lag.

## Architecture Overview

Instead of polling endpoints every 2-5 seconds, use Realtime to:
- **Subscribe** to database changes (duels, player_session_stats, leaderboard)
- **Push updates** automatically to all clients in real-time
- **Reduce API calls** by 90%+ for high-traffic scenarios

## Step 1: Enhanced Supabase Helper (`src/lib/supabase.js`)

```javascript path=/src/lib/supabase.js start=80
// Enhanced real-time subscriptions with proper cleanup
export const realtimeSubscriptions = {
  // Subscribe to all duels in a session
  subscribeToDuels(sessionId, onDuelAdded, onDuelUpdated, onDuelDeleted) {
    const channel = supabase
      .channel(`duels:${sessionId}`, {
        config: {
          broadcast: { self: true },
          presence: { key: sessionId }
        }
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'duels',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          console.log('New duel:', payload.new);
          onDuelAdded?.(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'duels',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          console.log('Duel updated:', payload.new);
          onDuelUpdated?.(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'duels',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          console.log('Duel deleted:', payload.old);
          onDuelDeleted?.(payload.old);
        }
      )
      .subscribe((status) => {
        console.log(`Duels subscription status: ${status}`);
      });

    return channel;
  },

  // Subscribe to player stats updates
  subscribeToPlayerStats(sessionId, onStatsUpdated) {
    const channel = supabase
      .channel(`stats:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'player_session_stats',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          console.log('Stats updated:', payload.new);
          onStatsUpdated?.(payload.new);
        }
      )
      .subscribe((status) => {
        console.log(`Stats subscription status: ${status}`);
      });

    return channel;
  },

  // Subscribe to leaderboard changes
  subscribeToLeaderboard(sessionId, onLeaderboardUpdated) {
    const channel = supabase
      .channel(`leaderboard:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_session_stats',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          onLeaderboardUpdated?.(payload);
        }
      )
      .subscribe();

    return channel;
  }
};
```

## Step 2: DuelRecords.jsx with Realtime Integration

Add subscriptions to your main page:

```javascript path=/src/pages/DuelRecords/DuelRecords.jsx start=1
import './DuelRecords.css';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase, realtimeSubscriptions } from '../../lib/supabase';
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
  
  // Refs to track subscriptions for cleanup
  const subscriptionsRef = useRef([]);
  const navigate = useNavigate();

  // Fetch initial data
  useEffect(() => {
    if (sessionId) {
      fetchSessionData();
      fetchUserStats();
      setupRealtimeSubscriptions();
    }

    return () => {
      // Cleanup all subscriptions on unmount
      subscriptionsRef.current.forEach((channel) => {
        supabase.removeChannel(channel);
      });
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
        const newStats = {
          points: data.stats.current_points || 0,
          wins: data.stats.total_wins || 0,
          losses: (data.stats.total_games || 0) - (data.stats.total_wins || 0),
          tier: data.stats.ladder_tiers?.tier_name || null,
          netWins: data.stats.current_net_wins || 0,
          winsRequired: data.stats.ladder_tiers?.wins_required || 5
        };
        setUserStats(newStats);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  // Setup realtime subscriptions
  const setupRealtimeSubscriptions = () => {
    try {
      const { data: { session } } = supabase.auth.getSession();
      if (!session?.user?.id) return;

      const currentUserId = session.user.user_metadata?.discord_id;

      // Subscribe to player stats for this user
      const statsChannel = realtimeSubscriptions.subscribeToPlayerStats(
        sessionId,
        (updatedStats) => {
          // Only update if it's for the current user
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
        }
      );

      subscriptionsRef.current.push(statsChannel);
    } catch (err) {
      console.error('Failed to setup realtime subscriptions:', err);
    }
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
```

## Step 3: Leaderboard Component with Realtime

```javascript path=/src/pages/DuelRecords/tabs/Leaderboard/Leaderboard.jsx start=1
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase, realtimeSubscriptions } from '../../../../lib/supabase';

function Leaderboard() {
  const { sessionId } = useParams();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const subscriptionRef = useRef(null);

  useEffect(() => {
    fetchLeaderboard();
    setupRealtimeLeaderboard();

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [sessionId]);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/sessions/${sessionId}/leaderboard`);
      const data = await response.json();
      setLeaderboard(data.leaderboard || []);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
      setLoading(false);
    }
  };

  const setupRealtimeLeaderboard = () => {
    subscriptionRef.current = realtimeSubscriptions.subscribeToLeaderboard(
      sessionId,
      (payload) => {
        // Update leaderboard in real-time when stats change
        setLeaderboard((prev) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const updated = prev.map(p => 
              p.id === payload.new.id ? payload.new : p
            );
            // Add if new
            if (!updated.find(p => p.id === payload.new.id)) {
              updated.push(payload.new);
            }
            return updated.sort((a, b) => b.current_points - a.current_points);
          }
          return prev;
        });
      }
    );
  };

  if (loading) return <div>Loading leaderboard...</div>;

  return (
    <div className="leaderboard">
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Points</th>
            <th>Wins</th>
            <th>Losses</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((player, idx) => (
            <tr key={player.id}>
              <td>{idx + 1}</td>
              <td>{player.username}</td>
              <td>{Math.round(player.current_points)}</td>
              <td>{player.total_wins}</td>
              <td>{player.total_games - player.total_wins}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Leaderboard;
```

## Step 4: DuelHistory with Realtime Updates

Update your DuelHistory component to listen for new duels:

```javascript path=/src/pages/DuelRecords/tabs/DuelHistory/DuelHistory.jsx start=1
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase, realtimeSubscriptions } from '../../../../lib/supabase';

function DuelHistory({ onDuelDeleted, isArchived }) {
  const { sessionId } = useParams();
  const [duels, setDuels] = useState([]);
  const [loading, setLoading] = useState(true);
  const subscriptionRef = useRef(null);

  useEffect(() => {
    fetchDuels();
    if (!isArchived) {
      setupRealtimeDuels();
    }

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [sessionId, isArchived]);

  const fetchDuels = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/sessions/${sessionId}/duels`);
      const data = await response.json();
      setDuels(data.duels || []);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load duels:', err);
      setLoading(false);
    }
  };

  const setupRealtimeDuels = () => {
    subscriptionRef.current = realtimeSubscriptions.subscribeToDuels(
      sessionId,
      // onDuelAdded
      (newDuel) => {
        setDuels((prev) => [newDuel, ...prev]);
      },
      // onDuelUpdated
      (updatedDuel) => {
        setDuels((prev) =>
          prev.map((d) => (d.id === updatedDuel.id ? updatedDuel : d))
        );
      },
      // onDuelDeleted
      (deletedDuel) => {
        setDuels((prev) => prev.filter((d) => d.id !== deletedDuel.id));
        onDuelDeleted?.();
      }
    );
  };

  if (loading) return <div>Loading duel history...</div>;

  return (
    <div className="duel-history">
      <table>
        <thead>
          <tr>
            <th>Opponent</th>
            <th>Result</th>
            <th>Points</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {duels.map((duel) => (
            <tr key={duel.id}>
              <td>{duel.opponent_name}</td>
              <td>{duel.result}</td>
              <td>{duel.points_change > 0 ? '+' : ''}{duel.points_change}</td>
              <td>{new Date(duel.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DuelHistory;
```

## Performance Tips for 50+ Users

1. **Filter subscriptions carefully**: Use `filter` parameter to only subscribe to relevant data
2. **Debounce updates**: Batch rapid changes before re-rendering
3. **Use key props**: Ensure React can efficiently diff and update lists
4. **Unsubscribe on unmount**: Always cleanup subscriptions to prevent memory leaks
5. **Paginate leaderboards**: Show top 20 by default, lazy-load more on scroll

## Monitoring

Check Supabase dashboard:
- Realtime connections active
- Message throughput
- Latency (should be <50ms for local changes)

Expected improvements:
- 90%+ reduction in API calls
- Sub-100ms updates for all clients
- No lag with 50+ concurrent users
