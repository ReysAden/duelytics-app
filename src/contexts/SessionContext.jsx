import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase, db } from '../lib/supabase';

const SessionContext = createContext();

export function SessionProvider({ children }) {
  const [sessions, setSessions] = useState([]);
  const [archivedSessions, setArchivedSessions] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const subscriptionRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [activeRes, archivedRes, tiersRes] = await Promise.all([
          fetch('http://localhost:3001/api/sessions?status=active'),
          fetch('http://localhost:3001/api/sessions?status=archived'),
          fetch('http://localhost:3001/api/ladder-tiers')
        ]);

        const activeData = await activeRes.json();
        const archivedData = await archivedRes.json();
        const tiersData = await tiersRes.json();

        if (activeData.sessions) setSessions(activeData.sessions);
        if (archivedData.sessions) setArchivedSessions(archivedData.sessions);
        if (tiersData.tiers) setTiers(tiersData.tiers);
      } catch (err) {
        // Silent fail
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Setup single realtime subscription (INSERT/UPDATE/DELETE)
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

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, []);

  return (
    <SessionContext.Provider value={{ sessions, archivedSessions, tiers, loading }}>
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
