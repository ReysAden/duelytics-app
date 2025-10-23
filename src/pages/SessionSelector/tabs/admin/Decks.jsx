import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import './Decks.css';

function Decks() {
  const [decks, setDecks] = useState([]);
  const [deckName, setDeckName] = useState('');
  const [deckImage, setDeckImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchDecks();
  }, []);

  const fetchDecks = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/decks');
      const data = await response.json();
      
      if (data.decks) {
        setDecks(data.decks);
      }
    } catch (err) {
      setError('Failed to load decks');
    }
  };

  const handleDeleteDeck = async (deckId) => {
    if (!confirm('Delete this deck?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`http://localhost:3001/api/decks/${deckId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete deck');
      }

      fetchDecks();
    } catch (err) {
      setError(err.message || 'Failed to delete deck');
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setDeckImage(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      // Create FormData to send image
      const formData = new FormData();
      formData.append('name', deckName);
      if (deckImage) {
        formData.append('image', deckImage);
      }

      // Create deck
      const response = await fetch('http://localhost:3001/api/decks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
          // Don't set Content-Type - browser will set it with boundary for multipart/form-data
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create deck');
      }

      setDeckName('');
      setDeckImage(null);
      // Reset file input
      document.getElementById('deckImage').value = '';
      fetchDecks();
    } catch (err) {
      setError(err.message || 'Failed to create deck');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="decks-tab">
      {error && <div className="message error-message">{error}</div>}
      {success && <div className="message success-message">{success}</div>}

      <form onSubmit={handleSubmit} className="deck-form">
        <div className="form-group">
          <label htmlFor="deckName">Deck Name</label>
          <input
            type="text"
            id="deckName"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            placeholder="Enter deck name"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="deckImage">Deck Image</label>
          <input
            type="file"
            id="deckImage"
            accept="image/*"
            onChange={handleImageChange}
            required
          />
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? 'Creating...' : 'Create Deck'}
        </button>
      </form>

      <div className="decks-divider"></div>

      <div className="current-decks">
        <h3>Current Decks</h3>
        {decks.length === 0 ? (
          <p style={{ color: 'rgba(255, 255, 255, 0.5)' }}>No decks yet</p>
        ) : (
          <div className="deck-list">
            {decks.map((deck) => (
              <div key={deck.id} className="deck-item">
                <button 
                  className="delete-deck-btn"
                  onClick={() => handleDeleteDeck(deck.id)}
                  title="Delete deck"
                >
                  ×
                </button>
                {deck.image_url && (
                  <img src={deck.image_url} alt={deck.name} className="deck-image" />
                )}
                <span className="deck-name">{deck.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Decks;
