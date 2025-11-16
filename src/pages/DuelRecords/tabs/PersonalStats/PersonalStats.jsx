import './PersonalStats.css';
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase, db } from '../../../../lib/supabase';
import Overview from './Overview';
import PointsTracker from './PointsTracker';
import DeckAnalysis from './DeckAnalysis';
import CoinFlip from './CoinFlip';
import Matchups from './Matchups';

function PersonalStats({ sessionData, targetUserId = null }) {
  const { t } = useTranslation('duelRecords');
  const { sessionId } = useParams();
  const [activeSubTab, setActiveSubTab] = useState('Overview');
  const [dateFilter, setDateFilter] = useState('all');
  const [availableDates, setAvailableDates] = useState([]);
  const subscriptionRef = useRef(null);

  const showPointsTracker = sessionData?.gameMode === 'rated' || sessionData?.gameMode === 'duelist_cup';

  useEffect(() => {
    fetchAvailableDates();
    subscriptionRef.current = db.subscribeToDuelChanges(sessionId, (payload) => {
      if (payload.eventType === 'INSERT') {
        fetchAvailableDates();
      }
    });
    
    return () => {
      if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current);
    };
  }, [sessionId, targetUserId]);

  const fetchAvailableDates = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const url = targetUserId 
        ? `http://localhost:3001/api/sessions/${sessionId}/dates?userId=${targetUserId}`
        : `http://localhost:3001/api/sessions/${sessionId}/dates`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      
      const data = await response.json();
      if (data.dates) {
        setAvailableDates(data.dates);
      }
    } catch (err) {
      console.error('Failed to load dates:', err);
    }
  };

  return (
    <>
      <header className="subtab-header">
        <nav className="subtab-nav">
          <button
            className={`subtab-btn ${activeSubTab === 'Overview' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('Overview')}
          >
            {t('personalStats.overview')}
          </button>
          {showPointsTracker && (
            <button
              className={`subtab-btn ${activeSubTab === 'Points Tracker' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('Points Tracker')}
            >
              {t('personalStats.pointsTracker')}
            </button>
          )}
          <button
            className={`subtab-btn ${activeSubTab === 'Deck Analysis' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('Deck Analysis')}
          >
            {t('personalStats.deckAnalysis')}
          </button>
          <button
            className={`subtab-btn ${activeSubTab === 'Coin Flip' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('Coin Flip')}
          >
            {t('personalStats.coinFlip')}
          </button>
          <button
            className={`subtab-btn ${activeSubTab === 'Matchups' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('Matchups')}
          >
            {t('personalStats.matchups')}
          </button>
        </nav>
        <select 
          className="date-filter"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        >
          <option value="all">{t('personalStats.allTime')}</option>
          {availableDates.map((date) => (
            <option key={date} value={date}>{date}</option>
          ))}
        </select>
      </header>

      <div className="subtab-content">
        {activeSubTab === 'Overview' && <Overview sessionId={sessionId} dateFilter={dateFilter} targetUserId={targetUserId} />}
        {activeSubTab === 'Points Tracker' && <PointsTracker sessionId={sessionId} dateFilter={dateFilter} targetUserId={targetUserId} />}
        {activeSubTab === 'Deck Analysis' && <DeckAnalysis sessionId={sessionId} dateFilter={dateFilter} targetUserId={targetUserId} />}
        {activeSubTab === 'Coin Flip' && <CoinFlip sessionId={sessionId} dateFilter={dateFilter} targetUserId={targetUserId} />}
        {activeSubTab === 'Matchups' && <Matchups sessionId={sessionId} dateFilter={dateFilter} targetUserId={targetUserId} />}
      </div>
    </>
  );
}

export default PersonalStats;
