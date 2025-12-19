function DeckHeader({ deck, className }) {
  return (
    <div className={`header-cell ${className}`}>
      <img src={deck.image_url} alt={deck.name} className="deck-image" />
    </div>
  );
}

export default DeckHeader;
