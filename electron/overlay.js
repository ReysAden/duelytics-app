let sessionId = null;
let sessionData = null;
let allDecks = [];

const formState = {
  yourDeck: null,
  oppDeck: null,
  coinFlip: null,
  turnOrder: null,
  matchResult: null,
  ratingChange: ''
};

// Get sessionId and authToken from query params
const params = new URLSearchParams(window.location.search);
sessionId = params.get('sessionId');
const authToken = params.get('authToken');

let isMinimized = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  if (sessionId) {
    fetchSessionData();
    fetchDecks();
  }
});

// Minimize/Close buttons
document.getElementById('minimizeBtn').addEventListener('click', async () => {
  isMinimized = !isMinimized;
  const form = document.getElementById('duelForm');
  const body = document.body;

  if (isMinimized) {
    form.style.display = 'none';
    await window.electronAPI.overlay.resize({ width: 70, height: 24 });
  } else {
    await window.electronAPI.overlay.resize({ width: 320, height: 420 });
    form.style.display = 'flex';
  }
});

document.getElementById('closeBtn').addEventListener('click', () => {
  window.close();
});

// Event Listeners
function setupEventListeners() {
  document.querySelectorAll('.choice-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const field = btn.dataset.field;
      const value = btn.dataset.value;
      formState[field] = value;

      btn.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      validateForm();
    });
  });

  document.querySelectorAll('.result-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const field = btn.dataset.field;
      const value = btn.dataset.value;
      formState[field] = value;

      btn.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      validateForm();
    });
  });

  document.getElementById('duelForm').addEventListener('submit', handleSubmit);
}

// Fetch Data
async function fetchSessionData() {
  try {
    const response = await fetch(`http://localhost:3001/api/sessions/${sessionId}`);
    const data = await response.json();
    if (data.session) {
      sessionData = data.session;
      updateRatingFieldVisibility();
    }
  } catch (err) {
    console.error('Failed to load session:', err);
  }
}

async function fetchDecks() {
  try {
    const response = await fetch('http://localhost:3001/api/decks');
    const data = await response.json();
    if (data.decks) {
      allDecks = data.decks;
      setupDeckAutocomplete();
    }
  } catch (err) {
    console.error('Failed to load decks:', err);
  }
}

// Autocomplete Setup (unchanged)
function setupDeckAutocomplete() {
  const yourDeckInput = document.getElementById('yourDeck');
  const oppDeckInput = document.getElementById('oppDeck');
  const yourDeckDropdown = document.getElementById('yourDeckDropdown');
  const oppDeckDropdown = document.getElementById('oppDeckDropdown');

  yourDeckInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = allDecks.filter(d => d.name.toLowerCase().includes(query));
    renderDropdown(yourDeckDropdown, filtered, (deck) => {
      formState.yourDeck = deck;
      yourDeckInput.value = deck.name;
      yourDeckDropdown.style.display = 'none';
      validateForm();
    });
  });

  oppDeckInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = allDecks.filter(d => d.name.toLowerCase().includes(query));
    renderDropdown(oppDeckDropdown, filtered, (deck) => {
      formState.oppDeck = deck;
      oppDeckInput.value = deck.name;
      oppDeckDropdown.style.display = 'none';
      validateForm();
    });
  });

  yourDeckInput.addEventListener('focus', () => {
    if (allDecks.length > 0) {
      renderDropdown(yourDeckDropdown, allDecks, (deck) => {
        formState.yourDeck = deck;
        yourDeckInput.value = deck.name;
        yourDeckDropdown.style.display = 'none';
        validateForm();
      });
    }
  });

  oppDeckInput.addEventListener('focus', () => {
    if (allDecks.length > 0) {
      renderDropdown(oppDeckDropdown, allDecks, (deck) => {
        formState.oppDeck = deck;
        oppDeckInput.value = deck.name;
        oppDeckDropdown.style.display = 'none';
        validateForm();
      });
    }
  });

  document.addEventListener('click', (e) => {
    const isYourDeckArea = e.target.closest('#yourDeck') || e.target.closest('#yourDeckDropdown');
    const isOppDeckArea = e.target.closest('#oppDeck') || e.target.closest('#oppDeckDropdown');
    
    if (!isYourDeckArea) yourDeckDropdown.style.display = 'none';
    if (!isOppDeckArea) oppDeckDropdown.style.display = 'none';
    
    if (isYourDeckArea && oppDeckDropdown.style.display !== 'none') {
      oppDeckDropdown.style.display = 'none';
    }
    if (isOppDeckArea && yourDeckDropdown.style.display !== 'none') {
      yourDeckDropdown.style.display = 'none';
    }
  });
}

function renderDropdown(dropdownEl, decks, onSelect) {
  dropdownEl.innerHTML = '';
  if (decks.length === 0) {
    dropdownEl.style.display = 'none';
    return;
  }

  decks.forEach(deck => {
    const item = document.createElement('div');
    item.className = 'dropdown-item';
    item.textContent = deck.name;
    item.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      onSelect(deck);
    });
    dropdownEl.appendChild(item);
  });

  const inputEl = dropdownEl.previousElementSibling;
  if (inputEl) {
    const rect = inputEl.getBoundingClientRect();
    dropdownEl.style.top = (rect.bottom + 2) + 'px';
    dropdownEl.style.left = rect.left + 'px';
    dropdownEl.style.width = rect.width + 'px';
  }

  dropdownEl.style.display = 'block';
}

// Validation
function validateForm() {
  const isValid =
    formState.yourDeck &&
    formState.oppDeck &&
    formState.coinFlip &&
    formState.turnOrder &&
    formState.matchResult;

  document.getElementById('submitBtn').disabled = !isValid;
}

function updateRatingFieldVisibility() {
  const ratingField = document.getElementById('ratingField');
  const showRating = sessionData && (sessionData.game_mode === 'rated' || sessionData.game_mode === 'duelist_cup');
  ratingField.style.display = showRating ? 'flex' : 'none';
}

// Form Submission (unchanged)
async function handleSubmit(e) {
  e.preventDefault();

  if (!sessionId || !sessionData) {
    alert('Session data not loaded');
    return;
  }

  try {
    if (!authToken) {
      alert('Authentication required');
      return;
    }

    const payload = {
      sessionId: sessionId,
      playerDeckId: formState.yourDeck.id,
      opponentDeckId: formState.oppDeck.id,
      coinFlipWon: formState.coinFlip === 'win',
      wentFirst: formState.turnOrder === 'first',
      result: formState.matchResult,
      pointsInput: formState.ratingChange ? parseFloat(formState.ratingChange) : 0
    };

    const response = await fetch('http://localhost:3001/api/duels', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok) {
      alert('Duel submitted!');
      
      // Notify main app to refresh
      window.electronAPI?.notifyDuelSubmitted?.(sessionId);
      
      formState.oppDeck = null;
      formState.coinFlip = null;
      formState.turnOrder = null;
      formState.matchResult = null;
      formState.ratingChange = '';
      document.getElementById('oppDeck').value = '';
      document.querySelectorAll('.choice-btn, .result-btn').forEach(btn => btn.classList.remove('active'));
      validateForm();
    } else {
      alert(data.error || 'Failed to submit duel');
    }
  } catch (err) {
    console.error('Submission error:', err);
    alert('An error occurred');
  }
}
