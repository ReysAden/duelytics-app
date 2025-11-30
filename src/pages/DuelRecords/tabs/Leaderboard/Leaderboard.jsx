import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../../lib/supabase';
import { useSessionData } from '../../../../contexts/SessionDataContext';
import { useArchiveSessionData } from '../../../../contexts/ArchiveSessionDataContext';
import './Leaderboard.css';

function Leaderboard() {
  const { t } = useTranslation(['common', 'duelRecords']);
  
  // Try archive context first, fallback to active session context
  let contextData;
  try {
    contextData = useArchiveSessionData();
  } catch {
    contextData = useSessionData();
  }
  const { leaderboard, sessionData, loading } = contextData;
  
  const [hideStats, setHideStats] = useState(false);
  const [toggling, setToggling] = useState(false);

  // Fetch user preference once
  useEffect(() => {
    fetchCurrentUserPreference();
  }, []);

  const fetchCurrentUserPreference = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`http://localhost:3001/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const me = await res.json();
      if (me && typeof me.hide_from_leaderboard === 'boolean') setHideStats(me.hide_from_leaderboard);
    } catch (e) {
      console.error('Failed to fetch user preference', e);
    }
  };

  const toggleHideStats = async () => {
    try {
      setToggling(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`http://localhost:3001/api/sessions/user/preferences`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ hide_from_leaderboard: !hideStats })
      });
      const data = await res.json();
      if (data?.user) setHideStats(!!data.user.hide_from_leaderboard);
      // Leaderboard will auto-update via realtime subscription
    } catch (e) {
      console.error('Failed to toggle preference', e);
    } finally {
      setToggling(false);
    }
  };

  // Memoize tier color calculation to avoid repeated lookups
  const getTierColor = useCallback((tierName) => {
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
  }, []);

  if (loading) {
    return (
      <div className="leaderboard-container">
        <div className="loading">{t('common:common.loading')}</div>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="leaderboard-container">
        <div className="no-data">{t('common:common.noData')}</div>
      </div>
    );
  }

  const isLadder = sessionData?.game_mode === 'ladder';
  const isArchived = sessionData?.status === 'archived';

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-header">
        {!isArchived && (
          <button className="hide-stats-toggle" onClick={toggleHideStats} disabled={toggling}>
            {hideStats ? t('duelRecords:leaderboard.showMyStats') : t('duelRecords:leaderboard.hideMyStats')}
          </button>
        )}
      </div>
      <div className="leaderboard-wrapper">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th className="rank-col">{t('duelRecords:leaderboard.rank')}</th>
              <th className="username-col">{t('duelRecords:leaderboard.player')}</th>
              <th className="points-col">{isLadder ? t('common:stats.rank') : t('duelRecords:leaderboard.points')}</th>
              <th className="games-col">{t('duelRecords:leaderboard.games')}</th>
              <th className="deck-col">{t('duelRecords:leaderboard.topDeck')}</th>
              <th className="winrate-col">{t('duelRecords:leaderboard.overall')}</th>
              <th className="winrate-col">{t('duelRecords:leaderboard.first')}</th>
              <th className="winrate-col">{t('duelRecords:leaderboard.second')}</th>
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
                      {player.tier_name || t('common:stats.unranked')}
                    </span>
                  ) : (
                    sessionData?.game_mode === 'rated' 
                      ? player.points.toFixed(2)
                      : Math.round(player.points)
                  )}
                </td>
                <td className="games-cell">{!isArchived && player.hide_stats ? '-' : player.total_games}</td>
                <td className="deck-cell">
                  {!isArchived && player.hide_stats ? (
                    <span className="deck-name">{t('duelRecords:leaderboard.hidden')}</span>
                  ) : (
                    player.top_deck ? <span className="deck-name">{player.top_deck}</span> : '-'
                  )}
                </td>
                <td className="winrate-cell">{!isArchived && player.hide_stats ? '-' : `${player.overall_winrate.toFixed(1)}%`}</td>
                <td className="winrate-cell">{!isArchived && player.hide_stats ? '-' : `${player.first_winrate.toFixed(1)}%`}</td>
                <td className="winrate-cell">{!isArchived && player.hide_stats ? '-' : `${player.second_winrate.toFixed(1)}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Leaderboard;
