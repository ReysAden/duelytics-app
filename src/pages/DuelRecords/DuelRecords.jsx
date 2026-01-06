import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import './DuelRecords.css';
import { TabHeader } from '../../components/TabHeader';
import { DuelRecordsSidebar } from './components/DuelRecordsSidebar';
import { SessionDataProvider, useSessionData } from '../../contexts/SessionDataContext';
import Submit from './tabs/Submit';
import PersonalStats from './tabs/PersonalStats/PersonalStats';
import DeckWinrates from './tabs/DeckWinrates/DeckWinrates';
import MatchupMatrix from './tabs/MatchupMatrix/MatchupMatrix';
import DuelHistory from './tabs/DuelHistory/DuelHistory';
import Leaderboard from './tabs/Leaderboard/Leaderboard';

function DuelRecordsContent() {
  const { t } = useTranslation(['duelRecords']);
  const { sessionId } = useParams();
  const { 
    sessionData: contextSessionData, 
    userStats, 
    invalidateCache, 
    fetchLeaderboardImmediate, 
    fetchDuelsImmediate, 
    fetchUserStatsImmediate,
    fetchDeckWinratesImmediate,
    fetchPersonalOverviewImmediate,
    fetchPersonalDeckAnalysisImmediate,
    fetchPersonalMatchupsImmediate,
    fetchMatchupsImmediate
  } = useSessionData();
  const [activeTab, setActiveTab] = useState('submit');
  const [activeSubTab, setActiveSubTab] = useState('Overview');
  
  // Set default subtab when switching tabs
  useEffect(() => {
    if (activeTab === 'matchup-matrix' && activeSubTab === 'Overview') {
      setActiveSubTab('Matrix');
    } else if (activeTab === 'personal-stats' && (activeSubTab === 'Matrix' || activeSubTab === 'Most Faced')) {
      setActiveSubTab('Overview');
    }
  }, [activeTab, activeSubTab]);
  const [dateFilter, setDateFilter] = useState('all');
  const [availableDates, setAvailableDates] = useState([]);
  const [overlayOpen, setOverlayOpen] = useState(false);

  // Close overlay when leaving DuelRecords
  useEffect(() => {
    return () => {
      window.electronAPI?.overlay?.close?.();
    };
  }, []);

  // Format session data from context
  const sessionData = {
    name: contextSessionData?.name || '',
    gameMode: contextSessionData?.game_mode || ''
  };

  // Format stats from context
  const stats = {
    points: userStats?.current_points || 0,
    wins: userStats?.total_wins || 0,
    losses: (userStats?.total_games || 0) - (userStats?.total_wins || 0),
    tier: userStats?.ladder_tiers?.tier_name || null,
    netWins: userStats?.current_net_wins || 0,
    winsRequired: userStats?.ladder_tiers?.wins_required || 0
  };

  const getTabDisplayName = () => {
    const names = {
      'submit': t('tabs.submit'),
      'personal-stats': t('tabs.personalStats'),
      'deck-winrate': t('tabs.deckWinrates'),
      'matchup-matrix': t('tabs.matchupMatrix'),
      'history': t('tabs.duelHistory'),
      'leaderboard': t('tabs.leaderboard')
    };
    return names[activeTab] || 'Duel Records';
  };

  const handleOpenOverlay = async () => {
    if (window.electronAPI?.overlay?.open) {
      const { data: { session } } = await supabase.auth.getSession();
      setOverlayOpen(true);
      const language = localStorage.getItem('language') || 'en';
      await window.electronAPI.overlay.open({
        sessionId,
        authToken: session?.access_token,
        language
      });
      // Listen for overlay close
      const checkInterval = setInterval(() => {
        if (!window.electronAPI?.overlay?.isOpen?.()) {
          setOverlayOpen(false);
          clearInterval(checkInterval);
        }
      }, 500);
    }
  };

  useEffect(() => {
    // Cleanup: close overlay when component unmounts
    return () => {
      window.electronAPI?.overlay?.close?.();
    };
  }, []);

  // Listen for duel submissions from overlay
  useEffect(() => {
    if (!window.electronAPI?.onDuelSubmitted) return;

    const handleDuelSubmitted = (submittedSessionId) => {
      // Only refresh if it's for the current session
      if (submittedSessionId === sessionId) {
        // Invalidate cache for all data types
        invalidateCache(['leaderboard', 'duels', 'userStats', 'deckWinrates', 'personalOverview', 'personalDeckAnalysis', 'personalMatchups', 'matchups']);
        // Fetch all data types immediately
        fetchLeaderboardImmediate();
        fetchDuelsImmediate();
        fetchUserStatsImmediate();
        fetchDeckWinratesImmediate();
        fetchPersonalOverviewImmediate();
        fetchPersonalDeckAnalysisImmediate();
        fetchPersonalMatchupsImmediate();
        fetchMatchupsImmediate();
      }
    };

    window.electronAPI.onDuelSubmitted(handleDuelSubmitted);

    // Note: electron IPC listeners don't return cleanup functions
    // They persist for the lifetime of the window
  }, [sessionId, invalidateCache, fetchLeaderboardImmediate, fetchDuelsImmediate, fetchUserStatsImmediate, fetchDeckWinratesImmediate, fetchPersonalOverviewImmediate, fetchPersonalDeckAnalysisImmediate, fetchPersonalMatchupsImmediate, fetchMatchupsImmediate]);

  return (
      <div style={{ display: 'flex', height: '100vh' }}>
        <DuelRecordsSidebar
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        sessionName={sessionData.name}
        gameMode={sessionData.gameMode}
        stats={stats}
        onOpenOverlay={handleOpenOverlay}
        overlayOpen={overlayOpen}
        activeSubTab={activeSubTab}
        onSubTabChange={setActiveSubTab}
        sessionData={sessionData}
      />
      <main style={{ flex: 1, marginLeft: '64px', overflow: 'auto' }}>
        <div style={{ position: 'sticky', top: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', paddingTop: '24px', paddingBottom: '24px', zIndex: 30 }}>
          <div 
            style={{
              backgroundColor: 'rgba(10, 10, 20, 0.7)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '8px 16px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
              minWidth: 'fit-content',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <h2 style={{
              color: 'rgba(255, 255, 255, 0.95)',
              fontSize: '16px',
              fontWeight: '600',
              margin: 0,
              letterSpacing: '0.5px'
            }}>
              {getTabDisplayName()}
            </h2>
          </div>
          {activeTab === 'personal-stats' && (
            <div style={{ display: 'flex', gap: '8px', background: 'rgba(10, 10, 20, 0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '8px 12px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)' }}>
              <button onClick={() => setActiveSubTab('Overview')} style={{ padding: '6px 10px', background: activeSubTab === 'Overview' ? 'rgba(99, 102, 241, 0.3)' : 'transparent', border: activeSubTab === 'Overview' ? '1px solid rgb(99, 102, 241)' : 'none', color: activeSubTab === 'Overview' ? '#ffffff' : 'rgba(255, 255, 255, 0.6)', borderRadius: '6px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>{t('personalStats.overview')}</button>
              {sessionData?.gameMode === 'rated' || sessionData?.gameMode === 'duelist_cup' ? <button onClick={() => setActiveSubTab('Points Tracker')} style={{ padding: '6px 10px', background: activeSubTab === 'Points Tracker' ? 'rgba(99, 102, 241, 0.3)' : 'transparent', border: activeSubTab === 'Points Tracker' ? '1px solid rgb(99, 102, 241)' : 'none', color: activeSubTab === 'Points Tracker' ? '#ffffff' : 'rgba(255, 255, 255, 0.6)', borderRadius: '6px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>{t('personalStats.pointsTracker')}</button> : null}
              <button onClick={() => setActiveSubTab('Deck Analysis')} style={{ padding: '6px 10px', background: activeSubTab === 'Deck Analysis' ? 'rgba(99, 102, 241, 0.3)' : 'transparent', border: activeSubTab === 'Deck Analysis' ? '1px solid rgb(99, 102, 241)' : 'none', color: activeSubTab === 'Deck Analysis' ? '#ffffff' : 'rgba(255, 255, 255, 0.6)', borderRadius: '6px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>{t('personalStats.deckAnalysis')}</button>
              <button onClick={() => setActiveSubTab('Coin Flip')} style={{ padding: '6px 10px', background: activeSubTab === 'Coin Flip' ? 'rgba(99, 102, 241, 0.3)' : 'transparent', border: activeSubTab === 'Coin Flip' ? '1px solid rgb(99, 102, 241)' : 'none', color: activeSubTab === 'Coin Flip' ? '#ffffff' : 'rgba(255, 255, 255, 0.6)', borderRadius: '6px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>{t('personalStats.coinFlip')}</button>
              <button onClick={() => setActiveSubTab('Matchups')} style={{ padding: '6px 10px', background: activeSubTab === 'Matchups' ? 'rgba(99, 102, 241, 0.3)' : 'transparent', border: activeSubTab === 'Matchups' ? '1px solid rgb(99, 102, 241)' : 'none', color: activeSubTab === 'Matchups' ? '#ffffff' : 'rgba(255, 255, 255, 0.6)', borderRadius: '6px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>{t('personalStats.matchups')}</button>
              <select 
                className="date-filter"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                style={{ marginLeft: '8px' }}
              >
                <option value="all">{t('personalStats.allTime')}</option>
                {availableDates.map((date) => (
                  <option key={date} value={date}>{date}</option>
                ))}
              </select>
            </div>
          )}
          {activeTab === 'matchup-matrix' && (
            <div style={{ display: 'flex', gap: '8px', background: 'rgba(10, 10, 20, 0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '8px 12px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)' }}>
              <button onClick={() => setActiveSubTab('Matrix')} style={{ padding: '6px 10px', background: activeSubTab === 'Matrix' ? 'rgba(99, 102, 241, 0.3)' : 'transparent', border: activeSubTab === 'Matrix' ? '1px solid rgb(99, 102, 241)' : 'none', color: activeSubTab === 'Matrix' ? '#ffffff' : 'rgba(255, 255, 255, 0.6)', borderRadius: '6px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>Matrix</button>
              <button onClick={() => setActiveSubTab('Most Faced')} style={{ padding: '6px 10px', background: activeSubTab === 'Most Faced' ? 'rgba(99, 102, 241, 0.3)' : 'transparent', border: activeSubTab === 'Most Faced' ? '1px solid rgb(99, 102, 241)' : 'none', color: activeSubTab === 'Most Faced' ? '#ffffff' : 'rgba(255, 255, 255, 0.6)', borderRadius: '6px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>Most Faced</button>
            </div>
          )}
        </div>
        <div style={{ paddingLeft: activeTab === 'matchup-matrix' ? '16px' : '32px', paddingRight: activeTab === 'matchup-matrix' ? '16px' : '32px', paddingBottom: activeTab === 'matchup-matrix' ? '16px' : '32px', marginLeft: '0' }}>
{activeTab === 'submit' && <Submit />}
          {activeTab === 'personal-stats' && <PersonalStats sessionData={sessionData} activeSubTab={activeSubTab} onSubTabChange={setActiveSubTab} dateFilter={dateFilter} setDateFilter={setDateFilter} availableDates={availableDates} setAvailableDates={setAvailableDates} />}
          {activeTab === 'deck-winrate' && <DeckWinrates sessionId={sessionId} />}
          {activeTab === 'matchup-matrix' && <MatchupMatrix viewMode={activeSubTab} />}
          {activeTab === 'history' && <DuelHistory sessionId={sessionId} onDuelDeleted={() => {
            // Invalidate all caches and refresh all data after deletion
            invalidateCache(['leaderboard', 'duels', 'userStats', 'deckWinrates', 'personalOverview', 'personalDeckAnalysis', 'personalMatchups', 'matchups']);
            fetchUserStatsImmediate();
            fetchDuelsImmediate();
            fetchLeaderboardImmediate();
            fetchDeckWinratesImmediate();
            fetchPersonalOverviewImmediate();
            fetchPersonalDeckAnalysisImmediate();
            fetchPersonalMatchupsImmediate();
            fetchMatchupsImmediate();
          }} />}
          {activeTab === 'leaderboard' && <Leaderboard />}
        </div>
      </main>
      </div>
  );
}

function DuelRecords() {
  const { sessionId } = useParams();
  const [activeTab, setActiveTab] = useState('submit');

  return (
    <SessionDataProvider sessionId={sessionId} activeTab={activeTab}>
      <DuelRecordsContent />
    </SessionDataProvider>
  );
}

export default DuelRecords;
