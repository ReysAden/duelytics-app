import './Matchups.css';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../../lib/supabase';

const COLORS = [
  '#4ade80', '#fb923c', '#f87171', '#60a5fa', '#c084fc',
  '#fbbf24', '#34d399', '#a78bfa', '#fb7185', '#818cf8'
];

const PIE_SIZE = 300;
const PIE_RADIUS = 60; // % from center to place images

function Matchups({ sessionId, dateFilter }) {
  const [matchups, setMatchups] = useState([]);
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('matrix');
  const [legendFilter, setLegendFilter] = useState('top10');

  useEffect(() => {
    fetchMatchups();
  }, [sessionId, dateFilter]);

  const fetchMatchups = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const url = `http://localhost:3001/api/sessions/${sessionId}/matchups${dateFilter !== 'all' ? `?days=${dateFilter}` : ''}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      
      const data = await response.json();
      if (data.matchups && data.decks) {
        setMatchups(data.matchups);
        setDecks(data.decks);
      }
    } catch (err) {
      console.error('Failed to load matchups:', err);
    } finally {
      setLoading(false);
    }
  };

  const getMatchup = (deckAId, deckBId) => {
    // Check if we have direct matchup: you played deckA vs deckB
    const direct = matchups.find(
      m => m.deckAId === deckAId && m.deckBId === deckBId
    );
    if (direct) return direct;

    // Check for inverse: you played deckB vs deckA (flip wins/losses)
    const inverse = matchups.find(
      m => m.deckAId === deckBId && m.deckBId === deckAId
    );
    if (inverse) {
      return {
        deckAId,
        deckBId,
        wins: inverse.losses,
        losses: inverse.wins,
        winRate: Math.round((inverse.losses / (inverse.wins + inverse.losses)) * 100)
      };
    }

    return null;
  };

  const getColor = (winRate) => {
    if (winRate === null) return 'rgba(255, 255, 255, 0.05)';
    if (winRate >= 60) return 'rgba(74, 222, 128, 0.5)';
    if (winRate >= 40) return 'rgba(251, 191, 36, 0.5)';
    return 'rgba(248, 113, 113, 0.5)';
  };


  // Memoize most faced data
  const mostFacedData = useMemo(() => {
    const deckCounts = new Map();
    
    matchups.forEach(m => {
      const deck = decks.find(d => d.id === m.deckBId);
      if (deck) {
        const cleanName = deck.name.trim();
        const existing = deckCounts.get(deck.id) || { name: cleanName, value: 0, image: deck.image_url };
        existing.value += m.wins + m.losses;
        deckCounts.set(deck.id, existing);
      }
    });

    const allData = Array.from(deckCounts.values()).sort((a, b) => b.value - a.value);
    return legendFilter === 'top10' ? allData.slice(0, 10) : allData;
  }, [matchups, decks, legendFilter]);

  const total = mostFacedData.reduce((sum, d) => sum + d.value, 0);

  if (loading) return <div className="matchups-loading">Loading...</div>;
  if (decks.length === 0) return <div className="no-data">No matchup data yet</div>;

  return (
    <>
      <div className="view-toggle">
        <button 
          className={`toggle-btn ${viewMode === 'matrix' ? 'active' : ''}`}
          onClick={() => setViewMode('matrix')}
        >
          Matrix View
        </button>
        <button 
          className={`toggle-btn ${viewMode === 'most-faced' ? 'active' : ''}`}
          onClick={() => setViewMode('most-faced')}
        >
          Most Faced
        </button>
      </div>

      {viewMode === 'matrix' ? (
        <div className="matchups-container">
          <table className="matchups-table">
        <thead>
          <tr>
            <th className="corner-cell"></th>
            {decks.map(deck => (
              <th key={`col-${deck.id}`} className="header-cell header-col">
                <img src={deck.image_url} alt={deck.name} className="deck-image" title={deck.name} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {decks.map(deckA => (
            <tr key={`row-${deckA.id}`}>
              <th className="header-cell header-row">
                <img src={deckA.image_url} alt={deckA.name} className="deck-image" title={deckA.name} />
              </th>
              {decks.map(deckB => {
                const matchup = getMatchup(deckA.id, deckB.id);
                const winRate = matchup ? matchup.winRate : null;
                
                return (
                  <td
                    key={`${deckA.id}-${deckB.id}`}
                    className="matchup-cell"
                    style={{ backgroundColor: getColor(winRate) }}
                    title={matchup ? `${deckA.name} vs ${deckB.name}: ${winRate}% (${matchup.wins}W-${matchup.losses}L)` : 'No data'}
                  >
                    {matchup ? (
                      <>
                        <div className="winrate">{winRate}%</div>
                        <div className="record">{matchup.wins}-{matchup.losses}</div>
                      </>
                    ) : (
                      <div className="no-matchup">-</div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
          </tbody>
        </table>
        </div>
      ) : (
        <div className="most-faced-layout">
          <svg className="pie-chart" viewBox="0 0 400 400">
            <defs>
              {mostFacedData.map((deck, index) => (
                <pattern
                  key={`pattern-${index}`}
                  id={`deck-pattern-${index}`}
                  x="0"
                  y="0"
                  width="100%"
                  height="100%"
                  patternContentUnits="objectBoundingBox"
                >
                  <image
                    href={deck.image}
                    x="0"
                    y="0"
                    width="1"
                    height="1"
                    preserveAspectRatio="xMidYMid slice"
                  />
                </pattern>
              ))}
            </defs>
            {(() => {
              let currentAngle = -90;
              return mostFacedData.map((deck, index) => {
                const percentage = (deck.value / total) * 100;
                const angle = (percentage / 100) * 360;
                const startAngle = currentAngle;
                const endAngle = currentAngle + angle;
                currentAngle = endAngle;

                const startRad = (startAngle * Math.PI) / 180;
                const endRad = (endAngle * Math.PI) / 180;
                const x1 = 200 + 150 * Math.cos(startRad);
                const y1 = 200 + 150 * Math.sin(startRad);
                const x2 = 200 + 150 * Math.cos(endRad);
                const y2 = 200 + 150 * Math.sin(endRad);
                const largeArc = angle > 180 ? 1 : 0;

                return (
                  <path
                    key={index}
                    d={`M 200 200 L ${x1} ${y1} A 150 150 0 ${largeArc} 1 ${x2} ${y2} Z`}
                    fill={`url(#deck-pattern-${index})`}
                    stroke="rgba(255, 255, 255, 0.3)"
                    strokeWidth="2"
                  />
                );
              });
            })()}
          </svg>

          <div className="legend-container">
            <div className="legend-filters">
              <button
                className={`filter-btn ${legendFilter === 'all' ? 'active' : ''}`}
                onClick={() => setLegendFilter('all')}
              >
                All
              </button>
              <button
                className={`filter-btn ${legendFilter === 'top10' ? 'active' : ''}`}
                onClick={() => setLegendFilter('top10')}
              >
                Top 10
              </button>
            </div>

            <div className="legend-header">
              <span>Deck</span>
              <span>Games</span>
              <span>%</span>
            </div>

            <div className="legend-list">
              {mostFacedData.map((deck, index) => {
                const percentage = ((deck.value / total) * 100).toFixed(1);
                return (
                  <div key={deck.name} className="legend-item" title={deck.name}>
                    <span className="deck-name">{deck.name}</span>
                    <span className="games">{deck.value}</span>
                    <span className="percentage">{percentage}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Matchups;
