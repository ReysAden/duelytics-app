const HEADER_HEIGHT = 40;
const NORMAL_WIDTH = 450;
const NORMAL_HEIGHT = 420;
const MIN_WIDTH = 100;

let isMinimized = false;
let allDecks = [];
let sessionData = null;
let currentLanguage = localStorage.getItem('language') || 'en';
let translations = {};

const translationStrings = {
  en: {
    submit: {
      yourDeck: 'Your Deck',
      opponentDeck: "Opponent's Deck",
      searchYourDeck: 'Search your deck...',
      searchOpponentDeck: "Search opponent's deck...",
      coinFlip: 'Coin Flip',
      won: 'Heads (Win)',
      lost: 'Tails (Loss)',
      turnOrder: 'Turn Order',
      first: 'First',
      second: 'Second',
      matchResult: 'Match Result',
      win: 'Win',
      loss: 'Loss',
      ratingChange: 'Point Change',
      submitting: 'Submit'
    }
  },
  es: {
    submit: {
      yourDeck: 'Tu Baraja',
      opponentDeck: 'Baraja del oponente',
      searchYourDeck: 'Buscando tu deck....',
      searchOpponentDeck: 'buscando el deck de tu oponente....',
      coinFlip: 'Resultado de moneda',
      won: 'Cara (Gana)',
      lost: 'Cruz (Pierde)',
      turnOrder: 'Orden de turno inicial',
      first: 'Primero',
      second: 'Segundo',
      matchResult: 'Resultado de la Partida',
      win: 'Victoria',
      loss: 'Derrota',
      ratingChange: 'Cambio de puntuación',
      submitting: 'Registrando....'
    }
  },
  ja: {
    submit: {
      yourDeck: 'あなたのデッキ',
      opponentDeck: '相手のデッキ',
      searchYourDeck: 'あなたのデッキを検索…',
      searchOpponentDeck: '相手のデッキを検索…',
      coinFlip: 'コイントス',
      won: '表(勝)',
      lost: '裏(敗)',
      turnOrder: 'ターン順',
      first: '先攻',
      second: '後攻',
      matchResult: '試合結果',
      win: '勝利',
      loss: '敗北',
      ratingChange: 'レーティング変更',
      submitting: '送信中…'
    }
  },
  ko: {
    submit: {
      yourDeck: '당신의 덱',
      opponentDeck: '대전 상대의 덱',
      searchYourDeck: '자신의 덱 검색',
      searchOpponentDeck: '대전 상대의 덱 검색',
      coinFlip: '코인토스',
      won: '앞면(승리)',
      lost: '뒷면(패배)',
      turnOrder: '선/후공',
      first: '선공',
      second: '후공',
      matchResult: '대전 결과',
      win: '승리',
      loss: '패배',
      ratingChange: '레이팅 변화',
      submitting: '제출 중...'
    }
  },
  zh: {
    submit: {
      yourDeck: '你的卡组',
      opponentDeck: '对手的卡组',
      searchYourDeck: '寻找你的卡组中…',
      searchOpponentDeck: '寻找对手的卡组中…',
      coinFlip: '硬币胜负',
      won: '正面(胜)',
      lost: '反面(负)',
      turnOrder: '先后攻',
      first: '先攻',
      second: '后攻',
      matchResult: '对战结果',
      win: '胜',
      loss: '负',
      ratingChange: '积分变化',
      submitting: '正在提交…'
    }
  }
};

let formState = {
  yourDeck: null,
  opponentDeck: null,
  coinFlip: null,
  turnOrder: null,
  matchResult: null,
  ratingChange: ''
};

const params = new URLSearchParams(window.location.search);
const sessionId = params.get('sessionId');
const authToken = params.get('authToken');
if (params.get('language')) {
  currentLanguage = params.get('language');
}

// DOM elements
const minimizeBtn = document.getElementById('minimizeBtn');
const closeBtn = document.getElementById('closeBtn');
const content = document.getElementById('content');
const duelForm = document.getElementById('duelForm');
const submitBtn = document.getElementById('submitBtn');
const ratingField = document.getElementById('ratingField');
const sessionNameEl = document.getElementById('sessionName');

// API base URL - use production Railway URL
const API_BASE_URL = 'https://duelytics-app-production.up.railway.app/api';

// Fetch decks
async function fetchDecks() {
  try {
    const response = await fetch(`${API_BASE_URL}/decks`);
    const data = await response.json();
    if (data.decks) allDecks = data.decks;
  } catch (err) {
    console.error('Failed to load decks:', err);
  }
}

// Fetch session to determine if rating field should show
async function fetchSession() {
  try {
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`);
    const data = await response.json();
    if (data.session) {
      sessionData = data.session;
      if (sessionNameEl) {
        sessionNameEl.textContent = sessionData.name || 'Duel Session';
      }
      // Show rating field for rated or duelist_cup modes
      if (data.session.game_mode === 'rated' || data.session.game_mode === 'duelist_cup') {
        ratingField.style.display = 'flex';
      }
    }
  } catch (err) {
    console.error('Failed to load session:', err);
  }
}

// Render dropdown with filtered decks
function renderDropdown(inputId, dropdownId, filterText) {
  const dropdown = document.getElementById(dropdownId);
  const filtered = allDecks.filter(d => d.name.toLowerCase().includes(filterText.toLowerCase()));
  
  if (filtered.length === 0) {
    dropdown.classList.remove('open');
    return;
  }
  
  dropdown.innerHTML = filtered.map(deck => 
    `<div class="dropdown-item" data-deck-id="${deck.id}" data-deck-name="${deck.name}">${deck.name}</div>`
  ).join('');
  
  dropdown.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('click', () => {
      const deckId = item.getAttribute('data-deck-id');
      const deckName = item.getAttribute('data-deck-name');
      const fieldName = inputId === 'yourDeck' ? 'yourDeck' : 'opponentDeck';
      formState[fieldName] = { id: parseInt(deckId), name: deckName };
      document.getElementById(inputId).value = deckName;
      dropdown.classList.remove('open');
      // Remember your deck choice
      if (inputId === 'yourDeck') {
        localStorage.setItem(`lastDeck_${sessionId}`, deckId);
      }
      validateForm();
    });
  });
  
  dropdown.classList.add('open');
}

// Setup deck input listeners
document.getElementById('yourDeck').addEventListener('input', (e) => {
  renderDropdown('yourDeck', 'yourDeckDropdown', e.target.value);
});

document.getElementById('oppDeck').addEventListener('input', (e) => {
  renderDropdown('oppDeck', 'oppDeckDropdown', e.target.value);
});

// Close dropdowns when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.matches('.field-select')) {
    document.querySelectorAll('.dropdown').forEach(dd => dd.classList.remove('open'));
  }
});

// Focus handlers to show all decks
document.getElementById('yourDeck').addEventListener('focus', (e) => {
  if (e.target.value === '') {
    renderDropdown('yourDeck', 'yourDeckDropdown', '');
  }
});

document.getElementById('oppDeck').addEventListener('focus', (e) => {
  if (e.target.value === '') {
    renderDropdown('oppDeck', 'oppDeckDropdown', '');
  }
});

// Load last selected deck for your deck
async function loadLastDeck() {
  if (allDecks.length > 0 && sessionId) {
    const savedDeckId = localStorage.getItem(`lastDeck_${sessionId}`);
    if (savedDeckId) {
      const savedDeck = allDecks.find(d => d.id === parseInt(savedDeckId));
      if (savedDeck) {
        formState.yourDeck = { id: savedDeck.id, name: savedDeck.name };
        document.getElementById('yourDeck').value = savedDeck.name;
      }
    }
  }
}

// Setup choice buttons (coin flip, turn order, match result)
document.querySelectorAll('[data-field]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const field = btn.getAttribute('data-field');
    const value = btn.getAttribute('data-value');
    
    // Deactivate siblings
    btn.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    formState[field] = value;
    
    // Auto-select turn order based on coin flip
    if (field === 'coinFlip') {
      const turnOrder = value === 'win' ? 'first' : 'second';
      formState.turnOrder = turnOrder;
      // Update turn order button visual state
      document.querySelectorAll('[data-field="turnOrder"]').forEach(b => {
        b.classList.remove('active');
        if (b.getAttribute('data-value') === turnOrder) {
          b.classList.add('active');
        }
      });
    }
    
    validateForm();
  });
});

// Form submission
duelForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validateForm()) return;
  
  try {
    // Get fresh auth token to avoid expiration issues
    let token = authToken;
    if (window.electronAPI?.auth?.getToken) {
      const freshToken = await window.electronAPI.auth.getToken();
      if (freshToken) token = freshToken;
    }
    
    const payload = {
      sessionId: sessionId,
      playerDeckId: formState.yourDeck.id,
      opponentDeckId: formState.opponentDeck.id,
      coinFlipWon: formState.coinFlip === 'win',
      wentFirst: formState.turnOrder === 'first',
      result: formState.matchResult,
      pointsInput: formState.ratingChange ? parseFloat(formState.ratingChange) : 0
    };
    
    const response = await fetch(`${API_BASE_URL}/duels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      // Success feedback (could be improved with a toast notification)
      console.log('Duel submitted successfully');
      resetForm();
      // Notify the main window to refresh
      window.electronAPI?.ipcRenderer?.send('duel:submitted', sessionId);
    } else {
      const data = await response.json();
      alert(data.error || 'Failed to submit');
    }
  } catch (err) {
    console.error('Submit error:', err);
    alert('An error occurred');
  }
});

function validateForm() {
  const isValid = formState.yourDeck && formState.opponentDeck && formState.coinFlip && formState.turnOrder && formState.matchResult;
  submitBtn.disabled = !isValid;
  return isValid;
}

function resetForm() {
  formState = {
    yourDeck: formState.yourDeck,
    opponentDeck: null,
    coinFlip: null,
    turnOrder: null,
    matchResult: null,
    ratingChange: ''
  };
  document.getElementById('oppDeck').value = '';
  document.getElementById('ratingChange').value = '';
  document.querySelectorAll('[data-field]').forEach(btn => btn.classList.remove('active'));
  validateForm();
}

// Minimize/restore handler
minimizeBtn.addEventListener('click', async () => {
  isMinimized = !isMinimized;
  
  if (isMinimized) {
    document.body.classList.add('minimized');
    content.classList.add('hidden');
    await new Promise(resolve => setTimeout(resolve, 10));
    await window.electronAPI?.overlay?.resize({ width: MIN_WIDTH, height: HEADER_HEIGHT });
  } else {
    document.body.classList.remove('minimized');
    await window.electronAPI?.overlay?.resize({ width: NORMAL_WIDTH, height: NORMAL_HEIGHT });
    await new Promise(resolve => setTimeout(resolve, 10));
    content.classList.remove('hidden');
  }
});

// Close handler
closeBtn.addEventListener('click', () => {
  window.close();
});

// Translation helpers
function getTranslation(key) {
  const keys = key.split('.');
  let value = translationStrings[currentLanguage];
  for (const k of keys) {
    value = value?.[k];
  }
  return value || translationStrings.en[keys[0]]?.[keys[1]] || key;
}

function updateTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = getTranslation(key);
  });
  
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = getTranslation(key);
  });
}

// Listen for language changes from main process
window.electronAPI?.onLanguageChange?.((language) => {
  if (language !== currentLanguage) {
    currentLanguage = language;
    updateTranslations();
  }
});

// Initialize
async function init() {
  updateTranslations();
  await fetchDecks();
  await loadLastDeck();
  await fetchSession();
}

init();
