import './Submit.css';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';

function Submit({ onDuelSubmitted }) {
  const { sessionId } = useParams();
  const [sessionData, setSessionData] = useState(null);
  const [decks, setDecks] = useState([]);
  const [yourDeckSearch, setYourDeckSearch] = useState('');
  const [oppDeckSearch, setOppDeckSearch] = useState('');
  const [showYourDeckDropdown, setShowYourDeckDropdown] = useState(false);
  const [showOppDeckDropdown, setShowOppDeckDropdown] = useState(false);
  const [formData, setFormData] = useState({
    yourDeck: null,
    opponentDeck: null,
    coinFlip: null,
    turnOrder: null,
    matchResult: null,
    ratingChange: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredYourDecks = decks.filter(deck => 
    deck.name.toLowerCase().includes(yourDeckSearch.toLowerCase())
  );

  const filteredOppDecks = decks.filter(deck => 
    deck.name.toLowerCase().includes(oppDeckSearch.toLowerCase())
  );

  useEffect(() => {
    fetchSessionData();
    fetchDecks();
  }, [sessionId]);

  const fetchSessionData = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/sessions/${sessionId}`);
      const data = await response.json();
      if (data.session) {
        setSessionData(data.session);
      }
    } catch (err) {
      console.error('Failed to load session:', err);
    }
  };

  const fetchDecks = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/decks');
      const data = await response.json();
      if (data.decks) {
        setDecks(data.decks);
      }
    } catch (err) {
      console.error('Failed to load decks:', err);
    }
  };

  const handleSubmit = async () => {
    if (!isFormValid()) return;

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('You must be logged in to submit a duel');
        setIsSubmitting(false);
        return;
      }

      const payload = {
        sessionId: sessionId,
        playerDeckId: formData.yourDeck.id,
        opponentDeckId: formData.opponentDeck.id,
        coinFlipWon: formData.coinFlip === 'win',
        wentFirst: formData.turnOrder === 'first',
        result: formData.matchResult,
        pointsInput: formData.ratingChange ? parseFloat(formData.ratingChange) : 0
      };

      const response = await fetch(`http://localhost:3001/api/duels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        alert('Duel submitted successfully!');
        setFormData({
          yourDeck: null,
          opponentDeck: null,
          coinFlip: null,
          turnOrder: null,
          matchResult: null,
          ratingChange: ''
        });
        setYourDeckSearch('');
        setOppDeckSearch('');
        if (onDuelSubmitted) onDuelSubmitted();
      } else {
        alert(data.error || 'Failed to submit duel');
      }
    } catch (err) {
      console.error('Failed to submit duel:', err);
      alert('An error occurred while submitting the duel');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = () => {
    return (
      formData.yourDeck &&
      formData.opponentDeck &&
      formData.coinFlip &&
      formData.turnOrder &&
      formData.matchResult
    );
  };

  const showRatingChange = sessionData?.game_mode === 'duelist_cup' || sessionData?.game_mode === 'rated';

  return (
    <div className="submit-container">
      <div className="submit-form">
        <div className="form-row">
          <div className="form-field">
            <label className="field-label">Your Deck *</label>
            <div className="combobox">
              <input
                type="text"
                className="field-select"
                placeholder={formData.yourDeck ? formData.yourDeck.name : "Search your deck..."}
                value={yourDeckSearch}
                onChange={(e) => setYourDeckSearch(e.target.value)}
                onClick={() => {
                  setShowYourDeckDropdown(!showYourDeckDropdown);
                  setShowOppDeckDropdown(false);
                }}
                onBlur={() => setTimeout(() => setShowYourDeckDropdown(false), 200)}
              />
              <svg className={`dropdown-icon ${showYourDeckDropdown ? 'open' : ''}`} width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {showYourDeckDropdown && filteredYourDecks.length > 0 && (
                <div className="dropdown">
                  {filteredYourDecks.map(deck => (
                    <div
                      key={deck.id}
                      className="dropdown-item"
                      onMouseDown={() => {
                        setFormData(prev => ({ ...prev, yourDeck: deck }));
                        setYourDeckSearch('');
                        setShowYourDeckDropdown(false);
                      }}
                    >
                      {deck.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="form-field">
            <label className="field-label">Opponent's Deck *</label>
            <div className="combobox">
              <input
                type="text"
                className="field-select"
                placeholder={formData.opponentDeck ? formData.opponentDeck.name : "Search opponent's deck..."}
                value={oppDeckSearch}
                onChange={(e) => setOppDeckSearch(e.target.value)}
                onClick={() => {
                  setShowOppDeckDropdown(!showOppDeckDropdown);
                  setShowYourDeckDropdown(false);
                }}
                onBlur={() => setTimeout(() => setShowOppDeckDropdown(false), 200)}
              />
              <svg className={`dropdown-icon ${showOppDeckDropdown ? 'open' : ''}`} width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {showOppDeckDropdown && filteredOppDecks.length > 0 && (
                <div className="dropdown">
                  {filteredOppDecks.map(deck => (
                    <div
                      key={deck.id}
                      className="dropdown-item"
                      onMouseDown={() => {
                        setFormData(prev => ({ ...prev, opponentDeck: deck }));
                        setOppDeckSearch('');
                        setShowOppDeckDropdown(false);
                      }}
                    >
                      {deck.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label className="field-label">Coin Flip *</label>
            <div className="button-group">
              <button
                type="button"
                className={`choice-btn ${formData.coinFlip === 'win' ? 'active' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, coinFlip: 'win' }))}
              >
                <img src="/heads-coin.png" alt="Win" className="btn-icon" />
                Win
              </button>
              <button
                type="button"
                className={`choice-btn ${formData.coinFlip === 'loss' ? 'active' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, coinFlip: 'loss' }))}
              >
                <img src="/tails-coin.png" alt="Loss" className="btn-icon" />
                Loss
              </button>
            </div>
          </div>

          <div className="form-field">
            <label className="field-label">Turn Order *</label>
            <div className="button-group">
              <button
                type="button"
                className={`choice-btn ${formData.turnOrder === 'first' ? 'active' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, turnOrder: 'first' }))}
              >
                <img src="/first.svg" alt="First" className="btn-icon" />
                First
              </button>
              <button
                type="button"
                className={`choice-btn ${formData.turnOrder === 'second' ? 'active' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, turnOrder: 'second' }))}
              >
                <img src="/second.svg" alt="Second" className="btn-icon" />
                Second
              </button>
            </div>
          </div>
        </div>

        <div className="form-field">
          <label className="field-label">Match Result *</label>
          <div className="button-group">
            <button
              type="button"
              className={`result-btn win ${formData.matchResult === 'win' ? 'active' : ''}`}
              onClick={() => setFormData(prev => ({ ...prev, matchResult: 'win' }))}
            >
              Win
            </button>
            <button
              type="button"
              className={`result-btn loss ${formData.matchResult === 'loss' ? 'active' : ''}`}
              onClick={() => setFormData(prev => ({ ...prev, matchResult: 'loss' }))}
            >
              Loss
            </button>
          </div>
        </div>

        {showRatingChange && (
          <div className="form-field">
            <label className="field-label">Rating Change</label>
            <input
              type="number"
              step="0.01"
              className="field-input"
              placeholder="Leave empty for default"
              value={formData.ratingChange}
              onChange={(e) => setFormData(prev => ({ ...prev, ratingChange: e.target.value }))}
            />
          </div>
        )}

        <button
          type="button"
          className={`submit-btn ${!isFormValid() || isSubmitting ? 'disabled' : ''}`}
          onClick={handleSubmit}
          disabled={!isFormValid() || isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </button>
      </div>
    </div>
  );
}

export default Submit;