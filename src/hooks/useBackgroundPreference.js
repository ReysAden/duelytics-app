import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { API_URL } from '../config/api';

export function useBackgroundPreference(user) {
  useEffect(() => {
    if (!user) return;

    const fetchAndCachePreference = async () => {
      try {
        // Check if already cached in localStorage
        const cached = localStorage.getItem('user_background');
        if (cached) {
          return;
        }

        // Fetch from API
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const response = await fetch(`${API_URL}/backgrounds/preference`, {
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
          }
        }
      } catch (error) {
        console.error('Failed to fetch background preference:', error);
      }
    };

    fetchAndCachePreference();
  }, [user]);
}
