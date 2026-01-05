import './Browse.css';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../lib/supabase';
import PersonalStats from './PersonalStats/PersonalStats';
import { API_URL } from '../../../config/api';

function Browse({ sessionData }) {
  const { t: tDuel } = useTranslation(['duelRecords']);
  const { t: tCommon } = useTranslation(['common']);
  const { sessionId } = useParams();
  const [participants, setParticipants] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('Overview');
  const [dateFilter, setDateFilter] = useState('all');
  const [availableDates, setAvailableDates] = useState([]);

  useEffect(() => {
    fetchParticipants();
  }, [sessionId]);

  const fetchParticipants = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Fetch leaderboard instead of participants to get proper sorting
      const response = await fetch(`${API_URL}/sessions/${sessionId}/leaderboard`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      
      const data = await response.json();
      if (data.leaderboard) {
        // Transform leaderboard data to match participant structure
        const participantsWithRank = data.leaderboard.map((player, index) => ({
          user_id: player.user_id,
          username: player.username,
          rank: index + 1,
          points: player.points,
          tier_name: player.tier_name
        }));
        setParticipants(participantsWithRank);
      }
    } catch (err) {
      console.error('Failed to load participants:', err);
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return <div className="browse-container">{tCommon('common.loading')}</div>;
  }

  return (
    <div className="browse-container">
      {!selectedUser ? (
        <div className="user-selector">
          <div className="combobox">
            <button
              className="field-select"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <span>
                {selectedUser ? selectedUser.username : tDuel('browse.searchUser')}
              </span>
              <svg className={`dropdown-icon ${showDropdown ? 'open' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06-.02L10 10.67l3.71-3.48a.75.75 0 111.02 1.1l-4.2 3.94a.75.75 0 01-1.02 0L5.25 8.29a.75.75 0 01-.02-1.08z" clipRule="evenodd"/>
              </svg>
            </button>
            {showDropdown && (
              <div className="dropdown">
                {participants.length > 0 ? (
                  participants.map(participant => (
                    <button
                      key={participant.user_id}
                      className="dropdown-item"
                      onMouseDown={() => {
                        setSelectedUser(participant);
                        setShowDropdown(false);
                      }}
                    >
                      <span className="dropdown-rank">#{participant.rank}</span>
                      <span>{participant.username}</span>
                    </button>
                  ))
                ) : (
                  <div style={{ padding: '12px 16px', color: '#9ca3af', textAlign: 'center', fontSize: '14px' }}>
                    {tDuel('browse.noParticipants')}
                  </div>
                )}
              </div>
            )}
          </div>

          {participants.length === 0 && (
            <p className="no-participants">{tDuel('browse.noParticipants')}</p>
          )}
        </div>
      ) : (
        <div className="user-stats-view">
          <div className="user-stats-header">
            <button className="back-to-browse" onClick={() => setSelectedUser(null)}>
              ←
            </button>
            <div className="viewing-label">
              <span>{selectedUser.username}</span>
            </div>
            <nav className="subtab-nav-inline">
              <button
                className={`subtab-btn ${activeSubTab === 'Overview' ? 'active' : ''}`}
                onClick={() => setActiveSubTab('Overview')}
              >
                {tDuel('personalStats.overview')}
              </button>
              {sessionData?.gameMode === 'rated' || sessionData?.gameMode === 'duelist_cup' ? (
                <button
                  className={`subtab-btn ${activeSubTab === 'Points Tracker' ? 'active' : ''}`}
                  onClick={() => setActiveSubTab('Points Tracker')}
                >
                  {tDuel('personalStats.pointsTracker')}
                </button>
              ) : null}
              <button
                className={`subtab-btn ${activeSubTab === 'Deck Analysis' ? 'active' : ''}`}
                onClick={() => setActiveSubTab('Deck Analysis')}
              >
                {tDuel('personalStats.deckAnalysis')}
              </button>
              <button
                className={`subtab-btn ${activeSubTab === 'Coin Flip' ? 'active' : ''}`}
                onClick={() => setActiveSubTab('Coin Flip')}
              >
                {tDuel('personalStats.coinFlip')}
              </button>
              <button
                className={`subtab-btn ${activeSubTab === 'Matchups' ? 'active' : ''}`}
                onClick={() => setActiveSubTab('Matchups')}
              >
                {tDuel('personalStats.matchups')}
              </button>
            </nav>
          </div>
          <PersonalStats 
            sessionData={sessionData} 
            targetUserId={selectedUser.user_id}
            activeSubTab={activeSubTab}
            onSubTabChange={setActiveSubTab}
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
            availableDates={availableDates}
            setAvailableDates={setAvailableDates}
          />
        </div>
      )}
    </div>
  );
}

export default Browse;
