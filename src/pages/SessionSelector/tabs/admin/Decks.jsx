import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../../lib/supabase';
import DeckCard from '../../../../components/DeckCard';
import './Decks.css';
import { API_URL } from '../../../../config/api';

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
  const [showEditModal, setShowEditModal] = useState(false);
  const [deckToEdit, setDeckToEdit] = useState(null);
  const [editDeckName, setEditDeckName] = useState('');

  useEffect(() => {
    fetchDecks();
  }, []);

  const fetchDecks = async () => {
    try {
      const response = await fetch(`${API_URL}/decks`);
      const data = await response.json();
      
      if (data.decks) {
        setDecks(data.decks);
      }
    } catch (err) {
      setError(t('ui.failedLoadDecks'));
    }
  };

  const handleEditDeck = (deck) => {
    setDeckToEdit(deck);
    setEditDeckName(deck.name);
    setShowEditModal(true);
  };

  const confirmEditDeck = async () => {
    if (!deckToEdit || !editDeckName.trim()) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_URL}/decks/${deckToEdit.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: editDeckName })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('ui.failedUpdateDeck'));
      }

      setShowEditModal(false);
      setDeckToEdit(null);
      setEditDeckName('');
      fetchDecks();
    } catch (err) {
      setError(err.message || t('ui.failedUpdateDeck'));
    }
  };

  const cancelEditDeck = () => {
    setShowEditModal(false);
    setDeckToEdit(null);
    setEditDeckName('');
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

      const response = await fetch(`${API_URL}/decks/${deckToDelete}`, {
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
      const response = await fetch(`${API_URL}/decks`, {
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
                onEdit={handleEditDeck}
                onDelete={handleDeleteDeck}
              />
            ))}
          </div>
        )}
      </div>

      {showEditModal && (
        <div className="modal-overlay" onClick={cancelEditDeck}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Deck Name</h3>
            <input
              type="text"
              value={editDeckName}
              onChange={(e) => setEditDeckName(e.target.value)}
              placeholder="Deck name"
              autoFocus
              style={{
                backgroundColor: '#374151',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '14px',
                width: '100%',
                marginBottom: '16px'
              }}
            />
            
            <div className="modal-actions">
              <button 
                className="cancel-btn" 
                onClick={cancelEditDeck}
              >
                {t('ui.cancel')}
              </button>
              <button 
                className="submit-btn" 
                onClick={confirmEditDeck}
                disabled={!editDeckName.trim()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

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
