import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../../lib/supabase';
import DeckCard from '../../../../components/DeckCard';
import './Decks.css';

function Decks() {
  const { t } = useTranslation(['common']);
  const [decks, setDecks] = useState([]);
  const [deckName, setDeckName] = useState('');
  const [deckImage, setDeckImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deckToDelete, setDeckToDelete] = useState(null);

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
      setError(t('ui.failedLoadDecks'));
    }
  };

  const handleDeleteDeck = (deckId) => {
    setDeckToDelete(deckId);
    setShowDeleteModal(true);
  };

  const confirmDeleteDeck = async () => {
    if (!deckToDelete) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`http://localhost:3001/api/decks/${deckToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('ui.failedDeleteDeck'));
      }

      setShowDeleteModal(false);
      setDeckToDelete(null);
      fetchDecks();
    } catch (err) {
      setError(err.message || t('ui.failedDeleteDeck'));
    }
  };

  const cancelDeleteDeck = () => {
    setShowDeleteModal(false);
    setDeckToDelete(null);
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
        setError(t('common.notAuthenticated'));
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
        throw new Error(data.error || t('ui.failedCreateDeck'));
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
          <input
            type="text"
            id="deckName"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            placeholder={t('ui.deckName')}
            required
            style={{
              backgroundColor: '#374151',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '14px',
              boxSizing: 'border-box',
              width: '100%'
            }}
          />
        </div>

        <div className="form-group">
          <input
            type="file"
            id="deckImage"
            accept="image/*"
            onChange={handleImageChange}
            required
            style={{
              backgroundColor: '#374151',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '14px',
              boxSizing: 'border-box',
              width: '100%'
            }}
          />
        </div>

        <button type="submit" className="submit-btn" disabled={loading || !deckName || !deckImage}>
          {loading ? t('ui.creating') : t('ui.createDeck')}
        </button>
      </form>

      <div className="decks-divider"></div>

      <div className="current-decks">
        {decks.length === 0 ? (
          <p style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{t('ui.noDecksYet')}</p>
        ) : (
          <div className="deck-list">
            {decks.map((deck) => (
              <DeckCard 
                key={deck.id} 
                deck={deck} 
                onDelete={handleDeleteDeck}
              />
            ))}
          </div>
        )}
      </div>

      {showDeleteModal && (
        <div className="modal-overlay" onClick={cancelDeleteDeck}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{t('ui.deleteDeck')}</h3>
            <p>{t('ui.confirmDeleteDeck')}</p>
            
            <div className="modal-actions">
              <button 
                className="cancel-btn" 
                onClick={cancelDeleteDeck}
              >
                {t('ui.cancel')}
              </button>
              <button 
                className="delete-confirm-btn" 
                onClick={confirmDeleteDeck}
              >
                {t('ui.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Decks;
