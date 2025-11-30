import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useBackgroundPreference(user) {
  useEffect(() => {
    if (!user) return;

    const fetchAndCachePreference = async () => {
      try {
        // Check if already cached in localStorage
        const cached = localStorage.getItem('user_background');
        if (cached) {
          console.log('📦 Background preference: Using localStorage cache');
          return;
        }

        // Fetch from API
        console.log('📥 Background preference: Fetching from API');
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const response = await fetch('http://localhost:3001/api/backgrounds/preference', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.background_url) {
            // Cache in localStorage for instant loading next time
            localStorage.setItem('user_background', data.background_url);
            
            // Apply immediately
            document.body.style.backgroundImage = `url('${data.background_url}')`;
            console.log('✅ Background preference: Applied from API');
          }
        }
      } catch (error) {
        console.error('Failed to fetch background preference:', error);
      }
    };

    fetchAndCachePreference();
  }, [user]);
}
