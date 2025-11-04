import './PersonalStats.css';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../../../lib/supabase';
import Overview from './Overview';
import PointsTracker from './PointsTracker';
import DeckAnalysis from './DeckAnalysis';
import CoinFlip from './CoinFlip';
import Matchups from './Matchups';

function PersonalStats({ sessionData }) {
  const { sessionId } = useParams();
  const [activeSubTab, setActiveSubTab] = useState('Overview');
  const [dateFilter, setDateFilter] = useState('all');
  const [availableDates, setAvailableDates] = useState([]);

  const showPointsTracker = sessionData?.gameMode === 'rated' || sessionData?.gameMode === 'duelist_cup';

  useEffect(() => {
    fetchAvailableDates();
  }, [sessionId]);

  const fetchAvailableDates = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`http://localhost:3001/api/sessions/${sessionId}/dates`, {
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
            Overview
          </button>
          {showPointsTracker && (
            <button
              className={`subtab-btn ${activeSubTab === 'Points Tracker' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('Points Tracker')}
            >
              Points Tracker
            </button>
          )}
          <button
            className={`subtab-btn ${activeSubTab === 'Deck Analysis' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('Deck Analysis')}
          >
            Deck Analysis
          </button>
          <button
            className={`subtab-btn ${activeSubTab === 'Coin Flip' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('Coin Flip')}
          >
            Coin Flip
          </button>
          <button
            className={`subtab-btn ${activeSubTab === 'Matchups' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('Matchups')}
          >
            Matchups
          </button>
        </nav>
        <select 
          className="date-filter"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        >
          <option value="all">All Time</option>
          {availableDates.map((date) => (
            <option key={date} value={date}>{date}</option>
          ))}
        </select>
      </header>

      <div className="subtab-content">
        {activeSubTab === 'Overview' && <Overview sessionId={sessionId} dateFilter={dateFilter} />}
        {activeSubTab === 'Points Tracker' && <PointsTracker sessionId={sessionId} dateFilter={dateFilter} />}
        {activeSubTab === 'Deck Analysis' && <DeckAnalysis sessionId={sessionId} dateFilter={dateFilter} />}
        {activeSubTab === 'Coin Flip' && <CoinFlip sessionId={sessionId} dateFilter={dateFilter} />}
        {activeSubTab === 'Matchups' && <Matchups sessionId={sessionId} dateFilter={dateFilter} />}
      </div>
    </>
  );
}

export default PersonalStats;
