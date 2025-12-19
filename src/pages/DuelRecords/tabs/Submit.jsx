import './Submit.css';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../../../lib/supabase';
import { useSessionData } from '../../../contexts/SessionDataContext';
import { API_URL } from '../../../config/api';

function Submit({ onDuelSubmitted }) {
  const { t } = useTranslation(['duelRecords']);
  const { sessionId } = useParams();
  const { 
    invalidateCache, 
    fetchUserStatsImmediate,
    fetchLeaderboardImmediate,
    fetchDuelsImmediate,
    fetchDeckWinratesImmediate,
    fetchPersonalOverviewImmediate,
    fetchPersonalDeckAnalysisImmediate,
    fetchPersonalMatchupsImmediate,
    fetchMatchupsImmediate
  } = useSessionData();
  const [sessionData, setSessionData] = useState(null);
  const [decks, setDecks] = useState([]);
  const [deckUsage, setDeckUsage] = useState({ player: {}, opponent: {} });
  const [yourDeckSearch, setYourDeckSearch] = useState('');
  const [oppDeckSearch, setOppDeckSearch] = useState('');
  const [showYourDeckDropdown, setShowYourDeckDropdown] = useState(false);
  const [showOppDeckDropdown, setShowOppDeckDropdown] = useState(false);
  const [showCoinFlipDropdown, setShowCoinFlipDropdown] = useState(false);
  const [showTurnOrderDropdown, setShowTurnOrderDropdown] = useState(false);
  const [formData, setFormData] = useState({
    yourDeck: null,
    opponentDeck: null,
    coinFlip: null,
    turnOrder: null,
    matchResult: null,
    ratingChange: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredYourDecks = decks
    .filter(deck => deck.name.toLowerCase().includes(yourDeckSearch.toLowerCase()))
    .sort((a, b) => (deckUsage.player[b.id] || 0) - (deckUsage.player[a.id] || 0));

  const filteredOppDecks = decks
    .filter(deck => deck.name.toLowerCase().includes(oppDeckSearch.toLowerCase()))
    .sort((a, b) => (deckUsage.opponent[b.id] || 0) - (deckUsage.opponent[a.id] || 0));

  useEffect(() => {
    fetchSessionData();
    fetchDecks();
    fetchDeckUsage();
  }, [sessionId]);

  // Close overlay when leaving Submit page
  useEffect(() => {
    return () => {
      if (window.electronAPI?.overlay?.close) {
        window.electronAPI.overlay.close();
      }
    };
  }, []);

  // Listen for duel submissions from overlay
  useEffect(() => {
    const handleDuelSubmitted = (submittedSessionId) => {
      if (submittedSessionId === sessionId) {
        // Refresh the duel list
        if (onDuelSubmitted) onDuelSubmitted();
      }
    };

    window.electronAPI?.onDuelSubmitted?.(handleDuelSubmitted);
  }, [sessionId, onDuelSubmitted]);

  // Load last selected deck for this session and user
  useEffect(() => {
    const loadLastDeck = async () => {
      if (decks.length > 0 && sessionId) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const savedDeckId = localStorage.getItem(`lastDeck_${session.user.id}_${sessionId}`);
          if (savedDeckId) {
            const savedDeck = decks.find(d => d.id === parseInt(savedDeckId));
            if (savedDeck) {
              setFormData(prev => ({ ...prev, yourDeck: savedDeck }));
            }
          }
        }
      }
    };
    loadLastDeck();
  }, [decks, sessionId]);

  const fetchSessionData = async () => {
    try {
      const response = await fetch(`${API_URL}/sessions/${sessionId}`);
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
      const response = await fetch(`${API_URL}/decks`);
      const data = await response.json();
      if (data.decks) {
        setDecks(data.decks);
      }
    } catch (err) {
      console.error('Failed to load decks:', err);
    }
  };

  const fetchDeckUsage = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_URL}/sessions/${sessionId}/duels`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const duels = await response.json();
      
      const playerUsage = {};
      const opponentUsage = {};
      
      if (Array.isArray(duels)) {
        duels.forEach(duel => {
          // Count player deck usage
          if (duel.player_deck_id) {
            playerUsage[duel.player_deck_id] = (playerUsage[duel.player_deck_id] || 0) + 1;
          }
          // Count opponent deck usage
          if (duel.opponent_deck_id) {
            opponentUsage[duel.opponent_deck_id] = (opponentUsage[duel.opponent_deck_id] || 0) + 1;
          }
        });
      }
      
      setDeckUsage({ player: playerUsage, opponent: opponentUsage });
    } catch (err) {
      console.error('Failed to load deck usage:', err);
    }
  };

  const handleSubmit = async () => {
    if (!isFormValid()) return;

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in to submit a duel');
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

      const response = await fetch(`${API_URL}/duels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        
        // Invalidate cache
        invalidateCache([
          'leaderboard', 
          'duels', 
          'userStats', 
          'matchups', 
          'deckWinrates',
          'personalOverview',
          'personalDeckAnalysis',
          'personalMatchups'
        ]);
        
        // Immediately refetch user stats for sidebar
        fetchUserStatsImmediate();
        
        // Force refetch all data in background so tabs show fresh data immediately when clicked
        setTimeout(() => {
          fetchLeaderboardImmediate();
          fetchDuelsImmediate();
          fetchDeckWinratesImmediate();
          fetchPersonalOverviewImmediate();
          fetchPersonalDeckAnalysisImmediate();
          fetchPersonalMatchupsImmediate();
          fetchMatchupsImmediate(); // Matchup Matrix (session-wide)
        }, 100);
        
        toast.success('Duel submitted successfully!');
        const lastDeck = formData.yourDeck;
        setFormData({
          yourDeck: lastDeck,
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
        toast.error(data.message || data.error || 'Failed to submit duel');
      }
    } catch (err) {
      console.error('Failed to submit duel:', err);
      toast.error('An error occurred while submitting the duel');
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

  const handleOpenOverlay = async () => {
    if (window.electronAPI?.overlay?.open) {
      const { data: { session } } = await supabase.auth.getSession();
      const language = localStorage.getItem('language') || 'en';
      await window.electronAPI.overlay.open({
        sessionId,
        authToken: session?.access_token,
        language
      });
    }
  };

  const handleDeleteLastDuel = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in');
        return;
      }

      const response = await fetch(`${API_URL}/duels/last?sessionId=${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        toast.success('Last duel deleted');
        
        // Refresh stats and data after deletion
        invalidateCache(['userStats', 'duels', 'leaderboard', 'deckWinrates', 'personalOverview', 'personalDeckAnalysis', 'personalMatchups', 'matchups']);
        fetchUserStatsImmediate();
        fetchDuelsImmediate();
        
        if (onDuelSubmitted) onDuelSubmitted();
      } else {
        const data = await response.json();
        toast.error(data.message || data.error || 'Failed to delete duel');
      }
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('An error occurred');
    }
  };

  return (
    <div className="submit-container">
      <div className="submit-form">
        <div className="form-row">
          <div className="form-field">
            <div className="combobox">
              <input
                type="text"
                className="field-select"
                placeholder={formData.yourDeck ? formData.yourDeck.name : t('submit.searchYourDeck')}
                value={yourDeckSearch}
                onChange={(e) => setYourDeckSearch(e.target.value)}
                onClick={() => {
                  setShowYourDeckDropdown(!showYourDeckDropdown);
                  setShowOppDeckDropdown(false);
                }}
                onBlur={() => setTimeout(() => setShowYourDeckDropdown(false), 200)}
                style={formData.yourDeck ? { backgroundImage: `url(${formData.yourDeck.image_url})` } : {}}
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
                      onMouseDown={async () => {
                        setFormData(prev => ({ ...prev, yourDeck: deck }));
                        const { data: { session } } = await supabase.auth.getSession();
                        if (session?.user) {
                          localStorage.setItem(`lastDeck_${session.user.id}_${sessionId}`, deck.id);
                        }
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
            <div className="combobox">
              <input
                type="text"
                className="field-select"
                placeholder={formData.opponentDeck ? formData.opponentDeck.name : t('submit.searchOpponentDeck')}
                value={oppDeckSearch}
                onChange={(e) => setOppDeckSearch(e.target.value)}
                onClick={() => {
                  setShowOppDeckDropdown(!showOppDeckDropdown);
                  setShowYourDeckDropdown(false);
                }}
                onBlur={() => setTimeout(() => setShowOppDeckDropdown(false), 200)}
                style={formData.opponentDeck ? { backgroundImage: `url(${formData.opponentDeck.image_url})` } : {}}
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
            <div className="combobox">
              <input
                type="text"
                className="field-select"
                placeholder={formData.coinFlip ? (formData.coinFlip === 'win' ? `${t('submit.coinFlip')}: ${t('submit.won')}` : `${t('submit.coinFlip')}: ${t('submit.lost')}`) : t('submit.coinFlip')}
                onClick={() => {
                  setShowCoinFlipDropdown(!showCoinFlipDropdown);
                  setShowYourDeckDropdown(false);
                  setShowOppDeckDropdown(false);
                }}
                onBlur={() => setTimeout(() => setShowCoinFlipDropdown(false), 200)}
                readOnly
              />
              <svg className={`dropdown-icon ${showCoinFlipDropdown ? 'open' : ''}`} width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {showCoinFlipDropdown && (
                <div className="dropdown">
                  <div
                    className="dropdown-item"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    onMouseDown={() => {
                      setFormData(prev => ({ ...prev, coinFlip: 'win' }));
                      setShowCoinFlipDropdown(false);
                    }}
                  >
                    <img src="./heads-coin.png" alt="Heads" style={{ width: '20px', height: '20px' }} />
                    {t('submit.won')}
                  </div>
                  <div
                    className="dropdown-item"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    onMouseDown={() => {
                      setFormData(prev => ({ ...prev, coinFlip: 'loss' }));
                      setShowCoinFlipDropdown(false);
                    }}
                  >
                    <img src="./tails-coin.png" alt="Tails" style={{ width: '20px', height: '20px' }} />
                    {t('submit.lost')}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="form-field">
            <div className="combobox">
              <input
                type="text"
                className="field-select"
                placeholder={formData.turnOrder ? (formData.turnOrder === 'first' ? t('submit.first') : t('submit.second')) : t('submit.turnOrder')}
                onClick={() => {
                  setShowTurnOrderDropdown(!showTurnOrderDropdown);
                  setShowYourDeckDropdown(false);
                  setShowOppDeckDropdown(false);
                  setShowCoinFlipDropdown(false);
                }}
                onBlur={() => setTimeout(() => setShowTurnOrderDropdown(false), 200)}
                readOnly
              />
              <svg className={`dropdown-icon ${showTurnOrderDropdown ? 'open' : ''}`} width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {showTurnOrderDropdown && (
                <div className="dropdown">
                  <div
                    className="dropdown-item"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    onMouseDown={() => {
                      setFormData(prev => ({ ...prev, turnOrder: 'first' }));
                      setShowTurnOrderDropdown(false);
                    }}
                  >
                    <img src="./first.svg" alt="First" style={{ width: '20px', height: '20px' }} />
                    {t('submit.first')}
                  </div>
                  <div
                    className="dropdown-item"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    onMouseDown={() => {
                      setFormData(prev => ({ ...prev, turnOrder: 'second' }));
                      setShowTurnOrderDropdown(false);
                    }}
                  >
                    <img src="./second.svg" alt="Second" style={{ width: '20px', height: '20px' }} />
                    {t('submit.second')}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="form-field">
          <div className="button-group">
            <button
              type="button"
              className={`result-btn win ${formData.matchResult === 'win' ? 'active' : ''}`}
              onClick={() => setFormData(prev => ({ ...prev, matchResult: 'win' }))}
            >
              {t('submit.win')}
            </button>
            <button
              type="button"
              className={`result-btn loss ${formData.matchResult === 'loss' ? 'active' : ''}`}
              onClick={() => setFormData(prev => ({ ...prev, matchResult: 'loss' }))}
            >
              {t('submit.loss')}
            </button>
          </div>
        </div>

        {showRatingChange && (
          <div className="form-field">
            <label className="field-label">{t('submit.ratingChange')}</label>
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

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            className={`submit-btn ${!isFormValid() || isSubmitting ? 'disabled' : ''}`}
            onClick={handleSubmit}
            disabled={!isFormValid() || isSubmitting}
          >
            {isSubmitting ? t('submit.submitting') : t('tabs.submit')}
          </button>
          <button
            type="button"
            className="delete-btn"
            onClick={handleDeleteLastDuel}
          >
            Delete Last
          </button>
        </div>
      </div>
    </div>
  );
}

export default Submit;