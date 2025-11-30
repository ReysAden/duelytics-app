import { useEffect } from 'react';

const DEFAULT_BACKGROUND = 'https://onamlvzviwqkqlaejlra.supabase.co/storage/v1/object/public/backgrounds/Default_Background.jpg';

export function useBackground(backgroundUrl = null) {
  useEffect(() => {
    if (backgroundUrl) {
      // Only update if it's different from what's already set
      const currentBg = document.body.style.backgroundImage;
      const newBg = `url('${backgroundUrl}')`;
      
      if (currentBg !== newBg) {
        document.body.style.backgroundImage = newBg;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundAttachment = 'fixed';
      }
    }

    // Don't clear on unmount - background persists across pages
  }, [backgroundUrl]);
}
