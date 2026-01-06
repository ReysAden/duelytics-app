import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase, db } from '../lib/supabase';
import { API_URL } from '../config/api';

const SessionDataContext = createContext();

export function SessionDataProvider({ sessionId, activeTab, children }) {
  // Cache state
  const [sessionData, setSessionData] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [decks, setDecks] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [matchups, setMatchups] = useState([]);
  const [duels, setDuels] = useState([]);
  const [deckWinrates, setDeckWinrates] = useState([]);
  // Personal stats sub-tab data
  const [personalOverview, setPersonalOverview] = useState(null);
  const [personalDeckAnalysis, setPersonalDeckAnalysis] = useState([]);
  const [personalMatchups, setPersonalMatchups] = useState({ matchups: [], decks: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Track last fetch time per dataset to avoid over-fetching
  const lastFetchRef = useRef({
    leaderboard: 0,
    matchups: 0,
    duels: 0,
    userStats: 0,
    deckWinrates: 0,
    personalOverview: 0,
    personalDeckAnalysis: 0,
    personalMatchups: 0
  });

  // Subscription refs
  const subscriptionsRef = useRef({});
  const refetchTimeoutRef = useRef(null);
  const lastRefetchTimeRef = useRef(0);

  // Fetch all initial data
  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch in parallel (7 base + 3 personal stats = 10 total)
      const [sessionRes, statsRes, decksRes, leaderboardRes, matchupsRes, duelsRes, deckWinratesRes, overviewRes, deckAnalysisRes, personalMatchupsRes] = await Promise.all([
        fetch(`${API_URL}/sessions/${sessionId}`),
        fetch(`${API_URL}/sessions/${sessionId}/stats`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        }),
        fetch(`${API_URL}/decks`),
        fetch(`${API_URL}/sessions/${sessionId}/leaderboard`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        }),
        fetch(`${API_URL}/sessions/${sessionId}/session-matchups`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        }),
        fetch(`${API_URL}/sessions/${sessionId}/duels`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        }),
        fetch(`${API_URL}/sessions/${sessionId}/deck-winrates`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        }),
        // Personal stats endpoints
        fetch(`${API_URL}/sessions/${sessionId}/overview`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        }),
        fetch(`${API_URL}/sessions/${sessionId}/deck-analysis`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        }),
        fetch(`${API_URL}/sessions/${sessionId}/matchups`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        })
      ]);

      const [sessionData, statsData, decksData, leaderboardData, matchupsData, duelsData, deckWinratesData, overviewData, deckAnalysisData, personalMatchupsData] = await Promise.all([
        sessionRes.json(),
        statsRes.json(),
        decksRes.json(),
        leaderboardRes.json(),
        matchupsRes.json(),
        duelsRes.json(),
        deckWinratesRes.json(),
        overviewRes.json(),
        deckAnalysisRes.json(),
        personalMatchupsRes.json()
      ]);

      // Update cache
      if (sessionData.session) setSessionData(sessionData.session);
      if (statsData.stats) setUserStats(statsData.stats);
      if (decksData.decks) setDecks(decksData.decks);
      if (leaderboardData.leaderboard) setLeaderboard(leaderboardData.leaderboard);
      // Store matchups (matrix component will derive faced decks from matchups)
      if (matchupsData.matchups) setMatchups(matchupsData.matchups);
      if (duelsData) setDuels(Array.isArray(duelsData) ? duelsData : []);
      if (deckWinratesData.decks) setDeckWinrates(deckWinratesData.decks);
      // Personal stats
      if (overviewData.overview) setPersonalOverview(overviewData.overview);
      if (deckAnalysisData.decks) setPersonalDeckAnalysis(deckAnalysisData.decks);
      if (personalMatchupsData.matchups) setPersonalMatchups(personalMatchupsData);

      setError(null);
    } catch (err) {
      console.error('Failed to fetch session data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Immediate fetch for leaderboard (no throttle - called on realtime events)
  const fetchLeaderboardImmediate = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_URL}/sessions/${sessionId}/leaderboard`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const data = await response.json();
      if (data.leaderboard) {
        setLeaderboard(data.leaderboard.sort((a, b) => (b.points ?? 0) - (a.points ?? 0)));
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard immediately:', err);
    }
  }, [sessionId]);

  // Immediate fetch for user stats (called on realtime events)
  const fetchUserStatsImmediate = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_URL}/sessions/${sessionId}/stats?_=${Date.now()}`, {
        headers: { 
          'Authorization': `Bearer ${session.access_token}`,
          'Cache-Control': 'no-cache'
        }
      });
      const data = await response.json();
      if (data.stats) {
        setUserStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch user stats immediately:', err);
    }
  }, [sessionId]);

  // Immediate fetch for duels (no throttle - called on realtime events)
  const fetchDuelsImmediate = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_URL}/sessions/${sessionId}/duels?_=${Date.now()}`, {
        headers: { 
          'Authorization': `Bearer ${session.access_token}`,
          'Cache-Control': 'no-cache'
        }
      });
      const data = await response.json();
      if (data) {
        setDuels(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch duels immediately:', err);
    }
  }, [sessionId]);

  // Background refetch for matchups only (1s throttle)
  const scheduleMatchupsRefetch = useCallback(() => {
    if (refetchTimeoutRef.current) clearTimeout(refetchTimeoutRef.current);
    
    const timeSinceLastRefetch = Date.now() - lastRefetchTimeRef.current;
    const delayNeeded = Math.max(0, 1000 - timeSinceLastRefetch);

    refetchTimeoutRef.current = setTimeout(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const response = await fetch(`${API_URL}/sessions/${sessionId}/session-matchups`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        const data = await response.json();
        if (data.matchups) setMatchups(data.matchups);
        lastRefetchTimeRef.current = Date.now();
      } catch (err) {
        console.error('Failed to refetch matchups:', err);
      }
    }, delayNeeded);
  }, [sessionId]);

  // Immediate fetch for deck winrates
  const fetchDeckWinratesImmediate = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_URL}/sessions/${sessionId}/deck-winrates?_=${Date.now()}`, {
        headers: { 
          'Authorization': `Bearer ${session.access_token}`,
          'Cache-Control': 'no-cache'
        }
      });
      const data = await response.json();
      if (data.decks) {
        setDeckWinrates(data.decks);
      }
    } catch (err) {
      console.error('Failed to fetch deck winrates:', err);
    }
  }, [sessionId]);

  // Immediate fetch for personal overview
  const fetchPersonalOverviewImmediate = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_URL}/sessions/${sessionId}/overview`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const data = await response.json();
      if (data.overview) {
        setPersonalOverview(data.overview);
      }
    } catch (err) {
      console.error('Failed to fetch personal overview:', err);
    }
  }, [sessionId]);

  // Immediate fetch for personal deck analysis
  const fetchPersonalDeckAnalysisImmediate = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_URL}/sessions/${sessionId}/deck-analysis`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const data = await response.json();
      if (data.decks) {
        setPersonalDeckAnalysis(data.decks);
      }
    } catch (err) {
      console.error('Failed to fetch personal deck analysis:', err);
    }
  }, [sessionId]);

  // Immediate fetch for personal matchups
  const fetchPersonalMatchupsImmediate = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_URL}/sessions/${sessionId}/matchups`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const data = await response.json();
      if (data.matchups) {
        setPersonalMatchups(data);
      }
    } catch (err) {
      console.error('Failed to fetch personal matchups:', err);
    }
  }, [sessionId]);

  // Immediate fetch for session-wide matchups (Matchup Matrix tab)
  const fetchMatchupsImmediate = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_URL}/sessions/${sessionId}/session-matchups`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const data = await response.json();
      if (data.matchups) {
        setMatchups(data.matchups);
        if (data.decks) setDecks(data.decks); // Update faced decks list
      }
    } catch (err) {
      console.error('Failed to fetch matchups:', err);
    }
  }, [sessionId]);

  // Setup realtime subscriptions
  const setupSubscriptions = useCallback(() => {
    // SINGLE subscription to duels table - handles INSERT/UPDATE/DELETE
    subscriptionsRef.current.duels = db.subscribeToDuels(
      sessionId,
      // onDuelAdded - optimistically add to cache
      (newDuel) => {
        // Refetch to get properly formatted data with deck names
        fetchDuelsImmediate();
        fetchUserStatsImmediate();
        fetchLeaderboardImmediate();
        scheduleMatchupsRefetch();
        // Refetch personal stats
        fetchPersonalOverviewImmediate();
        fetchPersonalDeckAnalysisImmediate();
        fetchPersonalMatchupsImmediate();
        fetchDeckWinratesImmediate();
      },
      // onDuelUpdated
      (updatedDuel) => {
        fetchDuelsImmediate();
        fetchUserStatsImmediate();
        fetchPersonalOverviewImmediate();
        fetchPersonalDeckAnalysisImmediate();
      },
      // onDuelDeleted
      (deletedDuel) => {
        fetchDuelsImmediate();
        fetchUserStatsImmediate();
        fetchLeaderboardImmediate();
        fetchPersonalOverviewImmediate();
        fetchPersonalDeckAnalysisImmediate();
        fetchPersonalMatchupsImmediate();
        fetchDeckWinratesImmediate();
      }
    );

    // On player stats change: update userStats immediately
    subscriptionsRef.current.stats = db.subscribeToPlayerStats(sessionId, (newStats) => {
      setUserStats(newStats);
    });

    // On leaderboard change: fetch leaderboard immediately
    subscriptionsRef.current.leaderboard = db.subscribeToLeaderboard(sessionId, () => {
      fetchLeaderboardImmediate();
    });

    // On session change: update session data
    subscriptionsRef.current.session = db.subscribeToSessions((newSession) => {
      if (newSession.id === sessionId) {
        setSessionData(newSession);
      }
    });
  }, [sessionId, fetchLeaderboardImmediate, fetchUserStatsImmediate, fetchDuelsImmediate, scheduleMatchupsRefetch, fetchPersonalOverviewImmediate, fetchPersonalDeckAnalysisImmediate, fetchPersonalMatchupsImmediate, fetchDeckWinratesImmediate]);

  // Cleanup subscriptions
  const cleanup = useCallback(() => {
    Object.values(subscriptionsRef.current).forEach(sub => {
      if (sub) supabase.removeChannel(sub);
    });
    subscriptionsRef.current = {};
    if (refetchTimeoutRef.current) clearTimeout(refetchTimeoutRef.current);
  }, []);

// Initial data load (once per sessionId)
  useEffect(() => {
    fetchAllData();
  }, [sessionId, fetchAllData]);

  // DISABLED real-time subscriptions to reduce load; we fetch on tab switch and on user actions
  // useEffect(() => {
  //   setupSubscriptions();
  //   return cleanup;
  // }, [sessionId, setupSubscriptions, cleanup]);
  
  // Fetch data when user switches to a tab (smart caching with 5s debounce)
  useEffect(() => {
    if (!activeTab) return;
    
    const now = Date.now();
    const CACHE_TIME = 5000; // 5 seconds cache
    
    switch (activeTab) {
      case 'leaderboard':
        if (now - lastFetchRef.current.leaderboard > CACHE_TIME) {
          fetchLeaderboardImmediate();
          lastFetchRef.current.leaderboard = now;
        }
        break;
        
      case 'history':
        if (now - lastFetchRef.current.duels > CACHE_TIME) {
          fetchDuelsImmediate();
          lastFetchRef.current.duels = now;
        }
        break;
        
      case 'matchup-matrix':
        if (now - lastFetchRef.current.matchups > CACHE_TIME) {
          scheduleMatchupsRefetch();
          lastFetchRef.current.matchups = now;
        }
        break;
        
      case 'personal-stats':
        // User-specific data, refresh on tab switch
        if (now - lastFetchRef.current.userStats > CACHE_TIME || now - lastFetchRef.current.personalOverview > CACHE_TIME || now - lastFetchRef.current.personalDeckAnalysis > CACHE_TIME || now - lastFetchRef.current.personalMatchups > CACHE_TIME) {
          fetchUserStatsImmediate();
          fetchPersonalOverviewImmediate();
          fetchPersonalDeckAnalysisImmediate();
          fetchPersonalMatchupsImmediate();
          lastFetchRef.current.userStats = now;
          lastFetchRef.current.personalOverview = now;
          lastFetchRef.current.personalDeckAnalysis = now;
          lastFetchRef.current.personalMatchups = now;
        }
        break;
        
      case 'deck-winrate':
        // Session-wide deck winrates, refresh on tab switch
        if (now - lastFetchRef.current.deckWinrates > CACHE_TIME) {
          fetchDeckWinratesImmediate();
          lastFetchRef.current.deckWinrates = now;
        }
        break;
    }
  }, [activeTab, sessionId]);

  // Refetch all data on demand
  const refetch = useCallback(async () => {
    await fetchAllData();
  }, [fetchAllData]);
  
  // Invalidate cache after user action (e.g., duel submission)
  const invalidateCache = useCallback((datasets = ['leaderboard', 'duels', 'userStats']) => {
    datasets.forEach(key => {
      lastFetchRef.current[key] = 0; // Force next fetch
    });
  }, []);
  
  const value = {
    // Data
    sessionData,
    userStats,
    decks,
    leaderboard,
    matchups,
    duels,
    deckWinrates,
    personalOverview,
    personalDeckAnalysis,
    personalMatchups,
    loading,
    error,
    // Methods
    refetch,
    invalidateCache,
    fetchLeaderboardImmediate,
    fetchUserStatsImmediate,
    fetchDuelsImmediate,
    fetchDeckWinratesImmediate,
    fetchPersonalOverviewImmediate,
    fetchPersonalDeckAnalysisImmediate,
    fetchPersonalMatchupsImmediate,
    fetchMatchupsImmediate
  };

  return (
    <SessionDataContext.Provider value={value}>
      {children}
    </SessionDataContext.Provider>
  );
}

// Hook to use session data context
export function useSessionData() {
  const context = useContext(SessionDataContext);
  if (!context) {
    throw new Error('useSessionData must be used within SessionDataProvider');
  }
  return context;
}
