import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const getTierColor = (tierName) => {
  if (!tierName) return '#ffffff';
  const tier = String(tierName).toLowerCase();
  if (tier.includes('rookie')) return '#4ade80';
  if (tier.includes('bronze')) return '#cd7f32';
  if (tier.includes('silver')) return '#c0c0c0';
  if (tier.includes('gold')) return '#ffd700';
  if (tier.includes('platinum')) return '#87ceeb';
  if (tier.includes('diamond')) return '#b19cd9';
  if (tier.includes('master')) return '#ff8c00';
  return '#ffffff';
};

export function DuelRecordsSidebar({ activeTab = 'overview', onTabChange = () => {}, sessionName = '', gameMode = '', stats = { points: 0, wins: 0, losses: 0, tier: null }, onOpenOverlay = () => {}, overlayOpen = false, activeSubTab = 'Overview', onSubTabChange = () => {}, sessionData = {}, isArchive = false }) {
  const showPointsTracker = sessionData?.gameMode === 'rated' || sessionData?.gameMode === 'duelist_cup';
  const navigate = useNavigate();
  const [hoveredTab, setHoveredTab] = useState(null);

  const handleTabClick = (tab) => {
    if (tab === 'submit' && overlayOpen) return;
    onTabChange(tab);
  };

  const handleBackToLobby = () => {
    navigate('/');
  };

  const getTabStyle = (tab) => {
    const isActive = activeTab === tab;
    const isDisabled = tab === 'submit' && overlayOpen;
    return {
      backgroundColor: isActive ? 'rgba(200, 200, 200, 0.4)' : 'transparent',
      borderTop: 'none',
      borderRight: 'none',
      borderBottom: 'none',
      borderLeft: 'none',
      padding: '6px 8px',
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      gap: 0,
      borderRadius: '6px',
      opacity: isDisabled ? 0.4 : 1,
    };
  };

  const getTabWrapperStyle = (tab) => {
    return {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      position: 'relative',
    };
  };
  
  const redLineStyle = {
    width: '2px',
    height: '32px',
    backgroundColor: '#ef4444',
    borderRadius: '1px',
    order: -1,
  };

  const tooltipStyle = {
    position: 'absolute',
    left: '72px',
    background: 'rgba(10, 10, 20, 0.8)',
    color: 'white',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '6px',
    padding: '4px 8px',
    fontSize: '11px',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    zIndex: 50,
  };

  return (
    <aside 
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: '64px',
        height: '100vh',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
      }}
    >
      {/* Session info at top */}
      <div style={{ position: 'absolute', top: '80px', width: '100%', padding: '0 4px', textAlign: 'center' }}>
        {sessionName && (
          <div style={{ color: 'white', fontSize: '11px', fontWeight: 600, lineHeight: '1.1', marginBottom: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {sessionName}
          </div>
        )}
        {gameMode === 'ladder' ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: 600 }}>
              {stats.wins} - {stats.losses}
            </span>
            <span style={{ color: getTierColor(stats.tier), fontSize: '11px', fontWeight: 600 }}>
              {stats.tier || 'Unranked'}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '10px' }}>
              {stats.netWins || 0}/{stats.winsRequired || 0}
            </span>
          </div>
        ) : (
          <>
            <div style={{ color: 'rgba(255,255,255,0.95)', fontSize: '12px', fontWeight: 700 }}>
              {typeof stats.points === 'number' ? stats.points : 0}
            </div>
            <div style={{ marginTop: '8px', fontSize: '11px', fontWeight: 600 }}>
              <span style={{ color: '#10b981' }}>{stats.wins}</span>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}> - </span>
              <span style={{ color: '#ef4444' }}>{stats.losses}</span>
            </div>
          </>
        )}
      </div>


      {/* Tabs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
        {/* Submit / Browse Tab */}
        {!isArchive ? (
          <div style={getTabWrapperStyle('submit')} onMouseEnter={() => setHoveredTab('submit')} onMouseLeave={() => setHoveredTab(null)}>
            {activeTab === 'submit' && <div style={redLineStyle} />}
            <button onClick={() => handleTabClick('submit')} style={getTabStyle('submit')}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '32px', height: '32px', color: 'white' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
              </svg>
            </button>
            {hoveredTab === 'submit' && <div style={{ ...tooltipStyle, top: '0' }}>Submit Duel</div>}
          </div>
        ) : (
          <div style={getTabWrapperStyle('browse')} onMouseEnter={() => setHoveredTab('browse')} onMouseLeave={() => setHoveredTab(null)}>
            {activeTab === 'browse' && <div style={redLineStyle} />}
            <button onClick={() => handleTabClick('browse')} style={getTabStyle('browse')}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '32px', height: '32px', color: 'white' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </button>
            {hoveredTab === 'browse' && <div style={{ ...tooltipStyle, top: '0' }}>Browse</div>}
          </div>
        )}

        {/* Personal Stats Tab */}
        <div style={getTabWrapperStyle('personal-stats')} onMouseEnter={() => setHoveredTab('personal-stats')} onMouseLeave={() => setHoveredTab(null)}>
          {activeTab === 'personal-stats' && <div style={redLineStyle} />}
          <button onClick={() => handleTabClick('personal-stats')} style={getTabStyle('personal-stats')}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '32px', height: '32px', color: 'white' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Zm6-10.125a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0Zm1.294 6.336a6.721 6.721 0 0 1-3.17.789 6.721 6.721 0 0 1-3.168-.789 3.376 3.376 0 0 1 6.338 0Z" />
            </svg>
          </button>
          {hoveredTab === 'personal-stats' && <div style={{ ...tooltipStyle, top: '0' }}>Personal Stats</div>}
        </div>

        {/* Deck Winrate Tab */}
        <div style={getTabWrapperStyle('deck-winrate')} onMouseEnter={() => setHoveredTab('deck-winrate')} onMouseLeave={() => setHoveredTab(null)}>
          {activeTab === 'deck-winrate' && <div style={redLineStyle} />}
          <button onClick={() => handleTabClick('deck-winrate')} style={getTabStyle('deck-winrate')}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '32px', height: '32px', color: 'white' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605" />
            </svg>
          </button>
          {hoveredTab === 'deck-winrate' && <div style={{ ...tooltipStyle, top: '0' }}>Deck Winrates</div>}
        </div>

        {/* Matchup Matrix Tab */}
        <div style={getTabWrapperStyle('matchup-matrix')} onMouseEnter={() => setHoveredTab('matchup-matrix')} onMouseLeave={() => setHoveredTab(null)}>
          {activeTab === 'matchup-matrix' && <div style={redLineStyle} />}
          <button onClick={() => handleTabClick('matchup-matrix')} style={getTabStyle('matchup-matrix')}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '32px', height: '32px', color: 'white' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
            </svg>
          </button>
          {hoveredTab === 'matchup-matrix' && <div style={{ ...tooltipStyle, top: '0' }}>Matchup Matrix</div>}
        </div>

        {/* History Tab */}
        <div style={getTabWrapperStyle('history')} onMouseEnter={() => setHoveredTab('history')} onMouseLeave={() => setHoveredTab(null)}>
          {activeTab === 'history' && <div style={redLineStyle} />}
          <button onClick={() => handleTabClick('history')} style={getTabStyle('history')}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '32px', height: '32px', color: 'white' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </button>
          {hoveredTab === 'history' && <div style={{ ...tooltipStyle, top: '0' }}>History</div>}
        </div>

        {/* Leaderboard Tab */}
        <div style={getTabWrapperStyle('leaderboard')} onMouseEnter={() => setHoveredTab('leaderboard')} onMouseLeave={() => setHoveredTab(null)}>
          {activeTab === 'leaderboard' && <div style={redLineStyle} />}
          <button onClick={() => handleTabClick('leaderboard')} style={getTabStyle('leaderboard')}>
            <svg xmlns="http://www.w3.org/2000/svg" height="32px" viewBox="0 -960 960 960" width="32px" fill="white" style={{ width: '32px', height: '32px' }}>
              <path d="M160-200h160v-320H160v320Zm240 0h160v-560H400v560Zm240 0h160v-240H640v240ZM80-120v-480h240v-240h320v320h240v400H80Z"/>
            </svg>
          </button>
          {hoveredTab === 'leaderboard' && <div style={{ ...tooltipStyle, top: '0' }}>Leaderboard</div>}
        </div>
      </div>

      {/* Overlay Button */}
      {!isArchive && (
        <button
          onClick={onOpenOverlay}
          style={{
            position: 'absolute',
            bottom: '80px',
            backgroundColor: 'transparent',
            border: 'none',
            padding: '6px 8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(200, 200, 200, 0.4)'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" height="32px" viewBox="0 -960 960 960" width="32px" fill="white" style={{ width: '32px', height: '32px' }}>
            <path d="M400-280h360v-240H400v240ZM160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm0-80h640v-480H160v480Zm0 0v-480 480Z"/>
          </svg>
        </button>
      )}

      {/* Back to Lobby Button */}
      <button
        onClick={handleBackToLobby}
        style={{
          position: 'absolute',
          bottom: '24px',
          backgroundColor: 'transparent',
          border: 'none',
          padding: '6px 8px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '6px',
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(200, 200, 200, 0.4)'}
        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '32px', height: '32px', color: 'white' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
        </svg>
      </button>
    </aside>
  );
}
