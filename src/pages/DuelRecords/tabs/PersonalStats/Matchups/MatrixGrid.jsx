import { useState } from 'react';
import DeckHeader from './DeckHeader';
import MatchupCell from './MatchupCell';

function MatrixGrid({ facedDecks, getMatchup }) {
  const [hoveredCell, setHoveredCell] = useState(null);

  return (
    <>
      {/* Sticky top header */}
      <div className="sticky-header" style={{ gridTemplateColumns: `60px repeat(${facedDecks.length}, 60px)` }}>
        <div className="corner-cell"></div>
        {facedDecks.map((deck, colIdx) => (
          <DeckHeader 
            key={`col-${deck.id}`} 
            deck={deck} 
            className={`top-header ${hoveredCell?.col === colIdx ? 'highlighted' : ''}`}
          />
        ))}
      </div>
      
      {/* Scrollable grid content */}
      <div 
        className="matrix-grid"
        style={{
          gridTemplateColumns: `60px repeat(${facedDecks.length}, 60px)`,
        }}
      >
        {facedDecks.map((rowDeck, rowIdx) => [
          /* Left column - your deck */
          <DeckHeader 
            key={`row-${rowDeck.id}`} 
            deck={rowDeck} 
            className={`left-header ${hoveredCell?.row === rowIdx ? 'highlighted' : ''}`}
          />,
          
          /* Matchup cells */
          ...facedDecks.map((colDeck, colIdx) => {
            const isActive = hoveredCell?.row === rowIdx && hoveredCell?.col === colIdx;
            const isHighlighted = hoveredCell?.row === rowIdx || hoveredCell?.col === colIdx;
            const matchup = getMatchup(rowDeck.id, colDeck.id);
            
            return (
              <MatchupCell
                key={`cell-${rowIdx}-${colIdx}`}
                matchup={matchup}
                isActive={isActive}
                isHighlighted={isHighlighted}
                onMouseEnter={() => setHoveredCell({ row: rowIdx, col: colIdx })}
                onMouseLeave={() => setHoveredCell(null)}
              />
            );
          })
        ])}
      </div>
    </>
  );
}
export default MatrixGrid;
