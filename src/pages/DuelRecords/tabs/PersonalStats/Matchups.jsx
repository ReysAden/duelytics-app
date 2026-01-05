import './Matchups.css';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useSessionData } from '../../../../contexts/SessionDataContext';
import { useArchiveSessionData } from '../../../../contexts/ArchiveSessionDataContext';
import { API_URL } from '../../../../config/api';
import MatrixGrid from './Matchups/MatrixGrid';
import MostFaced from './Matchups/MostFaced';

function Matchups({ sessionId, dateFilter, targetUserId = null }) {
  const [targetData, setTargetData] = useState(null);
  const [targetLoading, setTargetLoading] = useState(false);
  
  // Try archive context first, fallback to active session context
  let contextData;
  try {
    contextData = useArchiveSessionData();
  } catch {
    contextData = useSessionData();
  }
  const { personalMatchups: contextMatchups, loading: contextLoading } = contextData;
  
  // Fetch target user data if browsing another user
  useEffect(() => {
    if (targetUserId) {
      fetchTargetUserData();
    }
  }, [targetUserId, sessionId, dateFilter]);
  
  const fetchTargetUserData = async () => {
    setTargetLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      let url = `${API_URL}/sessions/${sessionId}/matchups`;
      const params = new URLSearchParams();
      if (dateFilter !== 'all') params.append('days', dateFilter);
      if (targetUserId) params.append('userId', targetUserId);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const result = await response.json();
      setTargetData(result);
    } catch (err) {
      console.error('Failed to load target user matchups:', err);
    } finally {
      setTargetLoading(false);
    }
  };
  
  const personalMatchups = targetUserId ? targetData : contextMatchups;
  const matchups = personalMatchups?.matchups || [];
  const decks = personalMatchups?.decks || [];
  const loading = targetUserId ? targetLoading : contextLoading;
  
  const [viewMode, setViewMode] = useState('matrix');

  // Memoize matchup lookup map to avoid O(n²) searches on every render
  const matchupMap = useMemo(() => {
    const map = new Map();
    matchups.forEach(m => {
      // Store both direct and inverse matchups
      map.set(`${m.deckAId}-${m.deckBId}`, m);
      map.set(`${m.deckBId}-${m.deckAId}`, {
        deckAId: m.deckBId,
        deckBId: m.deckAId,
        wins: m.losses,
        losses: m.wins,
        winRate: Math.round((m.losses / (m.wins + m.losses)) * 100)
      });
    });
    return map;
  }, [matchups]);

  const getMatchup = (deckAId, deckBId) => {
    return matchupMap.get(`${deckAId}-${deckBId}`) || null;
  };


  if (loading) {
    return (
      <div className="matchup-matrix-container">
        <div className="loading">Loading matchup data...</div>
      </div>
    );
  }
  
  if (decks.length === 0 || matchups.length === 0) {
    return (
      <div className="matchup-matrix-container">
        <div className="no-data">No matchup data yet. Submit some duels to see your matchup statistics!</div>
      </div>
    );
  }

  return (
    <>
      <nav className="matchups-nav-island">
        <button 
          className={`nav-tab ${viewMode === 'matrix' ? 'active' : ''}`}
          onClick={() => setViewMode('matrix')}
        >
          Matrix View
        </button>
        <button 
          className={`nav-tab ${viewMode === 'most-faced' ? 'active' : ''}`}
          onClick={() => setViewMode('most-faced')}
        >
          Most Faced
        </button>
      </nav>

      {viewMode === 'matrix' ? (
        <div className="matrix-wrapper">
          <MatrixGrid facedDecks={decks} getMatchup={getMatchup} />
        </div>
      ) : (
        <MostFaced matchups={matchups} decks={decks} />
      )}
    </>
  );
}

export default Matchups;