import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const ArchiveSessionDataContext = createContext();

export function ArchiveSessionDataProvider({ sessionId, children }) {
  // Cache state (same structure as SessionDataContext)
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
  
  // Cache flag - once loaded, never refetch (archived data is immutable)
  const [cacheLoaded, setCacheLoaded] = useState(false);

  // Fetch all data once (archived sessions don't change)
  const fetchAllData = useCallback(async () => {
    // If already cached, skip
    if (cacheLoaded) {
      console.log('📦 Archive: Using cached data (immutable)');
      return;
    }

    try {
      console.log('📥 Archive: Fetching all data for session', sessionId);
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch all endpoints in parallel (10 total)
      const [
        sessionRes,
        statsRes,
        decksRes,
        leaderboardRes,
        matchupsRes,
        duelsRes,
        deckWinratesRes,
        overviewRes,
        deckAnalysisRes,
        personalMatchupsRes
      ] = await Promise.all([
        fetch(`http://localhost:3001/api/sessions/${sessionId}`),
        fetch(`http://localhost:3001/api/sessions/${sessionId}/stats`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        }),
        fetch(`http://localhost:3001/api/decks`),
        fetch(`http://localhost:3001/api/sessions/${sessionId}/leaderboard`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        }),
        fetch(`http://localhost:3001/api/sessions/${sessionId}/matchups`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        }),
        fetch(`http://localhost:3001/api/sessions/${sessionId}/duels`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        }),
        fetch(`http://localhost:3001/api/sessions/${sessionId}/deck-winrates`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        }),
        // Personal stats endpoints
        fetch(`http://localhost:3001/api/sessions/${sessionId}/overview`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        }),
        fetch(`http://localhost:3001/api/sessions/${sessionId}/deck-analysis`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        }),
        fetch(`http://localhost:3001/api/sessions/${sessionId}/matchups`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        })
      ]);

      const [
        sessionData,
        statsData,
        decksData,
        leaderboardData,
        matchupsData,
        duelsData,
        deckWinratesData,
        overviewData,
        deckAnalysisData,
        personalMatchupsData
      ] = await Promise.all([
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
      if (matchupsData.matchups) setMatchups(matchupsData.matchups);
      if (duelsData) setDuels(Array.isArray(duelsData) ? duelsData : []);
      if (deckWinratesData.decks) setDeckWinrates(deckWinratesData.decks);
      // Personal stats
      if (overviewData.overview) setPersonalOverview(overviewData.overview);
      if (deckAnalysisData.decks) setPersonalDeckAnalysis(deckAnalysisData.decks);
      if (personalMatchupsData.matchups) setPersonalMatchups(personalMatchupsData);

      // Mark cache as loaded (never refetch)
      setCacheLoaded(true);
      setError(null);
      console.log('✅ Archive: All data cached (10 endpoints)');
    } catch (err) {
      console.error('❌ Archive: Failed to fetch data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId, cacheLoaded]);

  // Load data once on mount
  useEffect(() => {
    if (sessionId) {
      fetchAllData();
    }
  }, [sessionId, fetchAllData]);

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
    // State
    loading,
    error,
    // No refetch needed for archived sessions
    refetch: fetchAllData // Provided for compatibility, but won't refetch if cached
  };

  return (
    <ArchiveSessionDataContext.Provider value={value}>
      {children}
    </ArchiveSessionDataContext.Provider>
  );
}

export function useArchiveSessionData() {
  const context = useContext(ArchiveSessionDataContext);
  if (!context) {
    throw new Error('useArchiveSessionData must be used within ArchiveSessionDataProvider');
  }
  return context;
}
