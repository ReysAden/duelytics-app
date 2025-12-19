function MatchupCell({ matchup, isActive, isHighlighted, onMouseEnter, onMouseLeave }) {
  if (!matchup) {
    return (
      <div 
        className={`matchup-cell ${isActive ? 'active' : isHighlighted ? 'highlighted' : ''}`}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <span className="no-matchup">–</span>
      </div>
    );
  }

  const rate = matchup.winRate;
  let bgColor = 'rgba(255,255,255,0.05)';
  if (rate >= 60) bgColor = 'rgba(74,222,128,0.5)';
  else if (rate >= 40) bgColor = 'rgba(251,191,36,0.5)';
  else bgColor = 'rgba(248,113,113,0.5)';

  return (
    <div 
      className={`matchup-cell ${isActive ? 'active' : isHighlighted ? 'highlighted' : ''}`}
      style={{ backgroundColor: bgColor }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="winrate">{rate}%</div>
      <div className="record">{matchup.wins}-{matchup.losses}</div>
    </div>
  );
}

export default MatchupCell;
