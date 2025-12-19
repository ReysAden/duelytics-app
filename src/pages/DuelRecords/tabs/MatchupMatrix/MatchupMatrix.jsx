import './MatchupMatrix.css';
import { useMemo } from 'react';
import { useSessionData } from '../../../../contexts/SessionDataContext';
import { useArchiveSessionData } from '../../../../contexts/ArchiveSessionDataContext';
import MatrixGrid from './MatrixGrid';
import MostFaced from './MostFaced';

function MatchupMatrix({ viewMode = 'Matrix' }) {
  let contextData;
  try {
    contextData = useArchiveSessionData();
  } catch {
    contextData = useSessionData();
  }

  const { matchups, decks: allDecks, loading } = contextData;

const facedDecks = useMemo(() => {
    const deckCountMap = new Map();

    matchups.forEach(m => {
      const a = allDecks.find(d => d.id === m.deckAId);
      if (a) {
        const current = deckCountMap.get(a.id);
        deckCountMap.set(a.id, {
          deck: a,
          count: (current?.count || 0) + 1
        });
      }

      const b = allDecks.find(d => d.id === m.deckBId);
      if (b) {
        const current = deckCountMap.get(b.id);
        deckCountMap.set(b.id, {
          deck: b,
          count: (current?.count || 0) + 1
        });
      }
    });

    return Array.from(deckCountMap.values())
      .sort((a, b) => b.count - a.count)
      .map(e => e.deck);
  }, [matchups, allDecks]);

  const matchupMap = useMemo(() => {
    const map = new Map();
    matchups.forEach(m => {
      map.set(`${m.deckAId}-${m.deckBId}`, m);
      if (m.deckAId !== m.deckBId) {
        map.set(`${m.deckBId}-${m.deckAId}`, {
          wins: m.losses,
          losses: m.wins,
          winRate: Math.round((m.losses / (m.wins + m.losses)) * 100)
        });
      }
    });
    return map;
  }, [matchups]);

  const getMatchup = (deckAId, deckBId) => matchupMap.get(`${deckAId}-${deckBId}`) || null;

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="matrix-container">
      {viewMode === 'Most Faced' ? (
        <MostFaced matchups={matchups} allDecks={allDecks} />
      ) : (
        <MatrixGrid facedDecks={facedDecks} getMatchup={getMatchup} />
      )}
    </div>
  );
}

export default MatchupMatrix;
