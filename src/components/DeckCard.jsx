import './DeckCard.css';

export default function DeckCard({ deck, onDelete, onEdit }) {
  return (
    <div 
      className="deck-card-admin"
      style={{ backgroundImage: `url(${deck.image_url})` }}
    >
      <div className="deck-card-admin-actions">
        {onEdit && (
          <button
            className="deck-card-admin-edit"
            onClick={() => onEdit(deck)}
            title="Edit deck name"
          >
            ✎
          </button>
        )}
        {onDelete && (
          <button
            className="deck-card-admin-delete"
            onClick={() => onDelete(deck.id)}
            title="Delete deck"
          >
            ×
          </button>
        )}
      </div>
      <div className="deck-overlay-admin">
        <div className="deck-card-admin-name">{deck.name}</div>
      </div>
    </div>
  );
}
