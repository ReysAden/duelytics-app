import { useEffect } from 'react';

export function useBackground(backgroundUrl = null) {
  useEffect(() => {
    if (backgroundUrl) {
      document.body.style.backgroundImage = `url('${backgroundUrl}')`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundAttachment = 'fixed';
    } else {
      document.body.style.backgroundImage = 'none';
    }

    return () => {
      document.body.style.backgroundImage = 'none';
    };
  }, [backgroundUrl]);
}
