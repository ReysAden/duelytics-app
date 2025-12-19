import { useState, useMemo } from 'react';

function MostFaced({ matchups, allDecks }) {
  const [legendFilter, setLegendFilter] = useState('top10');

  const mostFacedData = useMemo(() => {
    const deckCounts = new Map();
    
    matchups.forEach(m => {
      // Count both deckA and deckB
      const deckA = allDecks.find(d => d.id === m.deckAId);
      const deckB = allDecks.find(d => d.id === m.deckBId);
      
      if (deckA) {
        const existing = deckCounts.get(deckA.id) || { 
          id: deckA.id,
          name: deckA.name, 
          value: 0, 
          image: deckA.image_url 
        };
        existing.value += m.wins + m.losses;
        deckCounts.set(deckA.id, existing);
      }
      
      if (deckB) {
        const existing = deckCounts.get(deckB.id) || { 
          id: deckB.id,
          name: deckB.name, 
          value: 0, 
          image: deckB.image_url 
        };
        existing.value += m.wins + m.losses;
        deckCounts.set(deckB.id, existing);
      }
    });

    const allData = Array.from(deckCounts.values()).sort((a, b) => b.value - a.value);
    return legendFilter === 'top10' ? allData.slice(0, 10) : allData;
  }, [matchups, allDecks, legendFilter]);

  const total = mostFacedData.reduce((sum, d) => sum + d.value, 0);

  return (
    <>
      {/* Container with pie chart and deck details side by side */}
      <div className="most-faced-container">
        {/* Pie chart island */}
        <div className="pie-chart-island">
          <div className="pie-chart-controls">
            <button
              className={`control-btn ${legendFilter === 'all' ? 'active' : ''}`}
              onClick={() => setLegendFilter('all')}
            >
              All
            </button>
            <button
              className={`control-btn ${legendFilter === 'top10' ? 'active' : ''}`}
              onClick={() => setLegendFilter('top10')}
            >
              Top 10
            </button>
          </div>
          <svg className="pie-chart" viewBox="0 0 400 400" style={{ width: '500px', height: '500px' }}>
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
        </div>

        {/* Deck details table */}
        <div className="deck-details-island">
          <div className="deck-details-header">
            <span>Deck</span>
            <span>Games</span>
            <span>%</span>
          </div>
          <div className="deck-details-list">
            {mostFacedData.map((deck) => {
              const percentage = ((deck.value / total) * 100).toFixed(1);
              return (
                <div key={deck.id} className="deck-details-item" title={deck.name}>
                  <span className="deck-name">{deck.name}</span>
                  <span className="deck-games">{deck.value}</span>
                  <span className="deck-percentage">{percentage}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

export default MostFaced;
