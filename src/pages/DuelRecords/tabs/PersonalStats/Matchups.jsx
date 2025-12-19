import './Matchups.css';
import { useState, useMemo } from 'react';
import { useSessionData } from '../../../../contexts/SessionDataContext';
import { useArchiveSessionData } from '../../../../contexts/ArchiveSessionDataContext';
import MatrixGrid from './Matchups/MatrixGrid';
import MostFaced from './Matchups/MostFaced';

function Matchups({ sessionId, dateFilter, targetUserId = null }) {
  // Try archive context first, fallback to active session context
  let contextData;
  try {
    contextData = useArchiveSessionData();
  } catch {
    contextData = useSessionData();
  }
  const { personalMatchups, loading } = contextData;
  const matchups = personalMatchups?.matchups || [];
  const decks = personalMatchups?.decks || [];
  
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