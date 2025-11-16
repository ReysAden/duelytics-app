import './DeckCard.css';

export default function DeckCard({ deck, onDelete }) {
  return (
    <div 
      className="deck-card-admin"
      style={{ backgroundImage: `url(${deck.image_url})` }}
    >
      {onDelete && (
        <button
          className="deck-card-admin-delete"
          onClick={() => onDelete(deck.id)}
          title="Delete deck"
        >
          ×
        </button>
      )}
      <div className="deck-overlay-admin">
        <div className="deck-card-admin-name">{deck.name}</div>
      </div>
    </div>
  );
}
