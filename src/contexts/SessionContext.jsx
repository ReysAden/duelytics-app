import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase, db } from '../lib/supabase';
import { API_URL } from '../config/api';

const SessionContext = createContext();

export function SessionProvider({ children }) {
  const [sessions, setSessions] = useState([]);
  const [archivedSessions, setArchivedSessions] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [participantCounts, setParticipantCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const subscriptionRef = useRef(null);

  const fetchData = async () => {
    try {
      const [activeRes, archivedRes, tiersRes] = await Promise.all([
        fetch(`${API_URL}/sessions?status=active`),
        fetch(`${API_URL}/sessions?status=archived`),
        fetch(`${API_URL}/ladder-tiers`)
      ]);

      const activeData = await activeRes.json();
      const archivedData = await archivedRes.json();
      const tiersData = await tiersRes.json();

      if (activeData.sessions) {
        setSessions(activeData.sessions);
        // Fetch participant counts in parallel
        fetchParticipantCounts(activeData.sessions);
      }
      if (archivedData.sessions) setArchivedSessions(archivedData.sessions);
      if (tiersData.tiers) setTiers(tiersData.tiers);
    } catch (err) {
      // Silent fail
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipantCounts = async (activeSessions) => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Fetch all participant counts in parallel
        const countPromises = activeSessions.map(async (s) => {
          try {
            const response = await fetch(`${API_URL}/sessions/${s.id}/participants`, {
              headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            const data = await response.json();
            return { id: s.id, count: data.participants?.length || 0 };
          } catch {
            return { id: s.id, count: 0 };
          }
        });

        const results = await Promise.all(countPromises);
        const counts = {};
        results.forEach(({ id, count }) => {
          counts[id] = count;
        });
        setParticipantCounts(counts);
      } catch (err) {
        console.error('Failed to fetch participant counts:', err);
      }
    };

  useEffect(() => {
    fetchData();

    // Setup session realtime subscription (INSERT/UPDATE/DELETE)
    subscriptionRef.current = db.subscribeToSessions((changed) => {
      if (!changed || !changed.id) return;
      const status = changed.status;

      if (status === 'active') {
        setSessions(prev => {
          const idx = prev.findIndex(s => s.id === changed.id);
          if (idx >= 0) return [...prev.slice(0, idx), changed, ...prev.slice(idx + 1)];
          return [changed, ...prev];
        });
        // Remove from archived if it moved
        setArchivedSessions(prev => prev.filter(s => s.id !== changed.id));
      } else if (status === 'archived') {
        setArchivedSessions(prev => {
          const idx = prev.findIndex(s => s.id === changed.id);
          if (idx >= 0) return [...prev.slice(0, idx), changed, ...prev.slice(idx + 1)];
          return [changed, ...prev];
        });
        // Remove from active if it moved
        setSessions(prev => prev.filter(s => s.id !== changed.id));
      }
    });

    // Subscribe to session_participants to refresh counts when someone joins
    const participantsChannel = supabase
      .channel('participants-changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'session_participants' },
        () => {
          // Refetch participant counts when someone joins a session
          if (sessions.length > 0) {
            fetchParticipantCounts(sessions);
          }
        }
      )
      .subscribe();

    // Auto-refresh participant counts every hour
    const intervalId = setInterval(() => {
      if (sessions.length > 0) {
        fetchParticipantCounts(sessions);
      }
    }, 60 * 60 * 1000); // 1 hour

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
      supabase.removeChannel(participantsChannel);
      clearInterval(intervalId);
    };
  }, [sessions]);

  // Expose refresh function for manual refreshes
  const refreshSessions = () => {
    fetchData();
  };

  return (
    <SessionContext.Provider value={{ sessions, archivedSessions, tiers, participantCounts, loading, refreshSessions }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSessionContext() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSessionContext must be used within SessionProvider');
  }
  return context;
}
