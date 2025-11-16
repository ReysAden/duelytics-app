import { useBackground } from '../hooks/useBackground';

export function Background({ backgroundUrl = 'https://onamlvzviwqkqlaejlra.supabase.co/storage/v1/object/public/backgrounds/Default_Background.jpg' }) {
  useBackground(backgroundUrl);
  return null;
}
