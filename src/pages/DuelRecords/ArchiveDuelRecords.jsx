import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import './DuelRecords.css';
import { DuelRecordsSidebar } from './components/DuelRecordsSidebar';
import Browse from './tabs/Browse';
import PersonalStats from './tabs/PersonalStats/PersonalStats';
import DeckWinrates from './tabs/DeckWinrates/DeckWinrates';
import MatchupMatrix from './tabs/MatchupMatrix/MatchupMatrix';
import DuelHistory from './tabs/DuelHistory/DuelHistory';
import Leaderboard from './tabs/Leaderboard/Leaderboard';
import { ArchiveSessionDataProvider } from '../../contexts/ArchiveSessionDataContext';
import { API_URL } from '../../config/api';

function ArchiveDuelRecords() {
  const { t } = useTranslation(['duelRecords']);
  const { sessionId } = useParams();
  const [activeTab, setActiveTab] = useState('browse');
  const [sessionData, setSessionData] = useState({ name: '', gameMode: '' });
  const [stats, setStats] = useState({ points: 0, wins: 0, losses: 0, tier: null });
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('Overview');
  const [dateFilter, setDateFilter] = useState('all');
  const [availableDates, setAvailableDates] = useState([]);

  useEffect(() => {
    if (sessionId) {
      fetchSessionData();
      fetchUserStats();
    }
  }, [sessionId]);

  const fetchSessionData = async () => {
    try {
      const response = await fetch(`${API_URL}/sessions/${sessionId}`);
      const data = await response.json();
      if (data.session) {
        setSessionData({
          name: data.session.name,
          gameMode: data.session.game_mode
        });
      }
    } catch (err) {
      console.error('Failed to load session:', err);
    }
  };

  const fetchUserStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_URL}/sessions/${sessionId}/stats`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();
      if (data.stats) {
        setStats({
          points: data.stats.current_points || 0,
          wins: data.stats.total_wins || 0,
          losses: (data.stats.total_games || 0) - (data.stats.total_wins || 0),
          tier: data.stats.ladder_tiers?.tier_name || null
        });
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTabDisplayName = () => {
    const names = {
      'browse': t('tabs.browse'),
      'personal-stats': t('tabs.personalStats'),
      'deck-winrate': t('tabs.deckWinrates'),
      'matchup-matrix': t('tabs.matchupMatrix'),
      'history': t('tabs.duelHistory'),
      'leaderboard': t('tabs.leaderboard')
    };
    return names[activeTab] || t('tabs.browse');
  };

  return (
    <ArchiveSessionDataProvider sessionId={sessionId}>
      <div style={{ display: 'flex', height: '100vh' }}>
        <DuelRecordsSidebar
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        sessionName={sessionData.name}
        gameMode={sessionData.gameMode}
        stats={stats}
        onOpenOverlay={null}
        activeSubTab={activeSubTab}
        onSubTabChange={setActiveSubTab}
        sessionData={sessionData}
        isArchive={true}
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
        </div>
        <div style={{ paddingLeft: activeTab === 'matchup-matrix' ? '16px' : '32px', paddingRight: activeTab === 'matchup-matrix' ? '16px' : '32px', paddingBottom: activeTab === 'matchup-matrix' ? '16px' : '32px' }}>
          {activeTab === 'browse' && <Browse sessionData={sessionData} />}
          {activeTab === 'personal-stats' && <PersonalStats sessionData={sessionData} activeSubTab={activeSubTab} onSubTabChange={setActiveSubTab} dateFilter={dateFilter} setDateFilter={setDateFilter} availableDates={availableDates} setAvailableDates={setAvailableDates} />}
          {activeTab === 'deck-winrate' && <DeckWinrates sessionId={sessionId} />}
          {activeTab === 'matchup-matrix' && <MatchupMatrix />}
          {activeTab === 'history' && <DuelHistory sessionId={sessionId} onDuelDeleted={null} isArchived={true} />}
          {activeTab === 'leaderboard' && <Leaderboard />}
        </div>
      </main>
      </div>
    </ArchiveSessionDataProvider>
  );
}

export default ArchiveDuelRecords;
