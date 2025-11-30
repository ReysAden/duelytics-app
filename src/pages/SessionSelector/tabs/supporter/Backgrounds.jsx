import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../../lib/supabase';
import './Backgrounds.css';

// Cache for backgrounds list (5 min TTL)
let backgroundsCache = null;
let backgroundsCacheTime = 0;
const BACKGROUNDS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cache for user preference (session-persistent)
let userPreferenceCache = null;

function Backgrounds({ user }) {
  const { t } = useTranslation(['common']);
  const [backgroundName, setBackgroundName] = useState('');
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [backgrounds, setBackgrounds] = useState([]);
  const [selectedBackground, setSelectedBackground] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [backgroundToDelete, setBackgroundToDelete] = useState(null);

  useEffect(() => {
    fetchBackgrounds();
    fetchUserPreference();
  }, [user]);

  const fetchBackgrounds = async () => {
    // Check cache first (5 min TTL)
    const now = Date.now();
    if (backgroundsCache && (now - backgroundsCacheTime < BACKGROUNDS_CACHE_TTL)) {
      console.log('📦 Backgrounds: Using cached list');
      setBackgrounds(backgroundsCache);
      return;
    }

    try {
      console.log('📥 Backgrounds: Fetching from API');
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('http://localhost:3001/api/backgrounds', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        // Update cache
        backgroundsCache = data;
        backgroundsCacheTime = now;
        setBackgrounds(data);
      }
    } catch (error) {
      // Silent fail
    }
  };

  const fetchUserPreference = async () => {
    // Check cache first (session-persistent)
    if (userPreferenceCache) {
      console.log('📦 Backgrounds: Using cached preference');
      if (userPreferenceCache.background_url) {
        setSelectedBackground(userPreferenceCache.background_url);
        applyBackground(userPreferenceCache.background_url);
      }
      return;
    }

    try {
      console.log('📥 Backgrounds: Fetching preference from API');
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('http://localhost:3001/api/backgrounds/preference', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Cache preference for this session
        userPreferenceCache = data;
        if (data.background_url) {
          setSelectedBackground(data.background_url);
          applyBackground(data.background_url);
        }
      }
    } catch (error) {
      // Silent fail
    }
  };

  const compressImage = (file, maxWidth = 1920, maxHeight = 1080, quality = 0.8) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              resolve(new File([blob], file.name, { type: 'image/jpeg' }));
            },
            'image/jpeg',
            quality
          );
        };
      };
      reader.onerror = reject;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!backgroundName || !backgroundImage) {
      setErrorMessage(t('ui.provideBothNameAndImage'));
      return;
    }

    setUploading(true);
    setErrorMessage('');

    try {
      const compressedImage = await compressImage(backgroundImage);

      const formData = new FormData();
      formData.append('name', backgroundName);
      formData.append('image', compressedImage);

      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('http://localhost:3001/api/backgrounds', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: formData,
      });

      if (response.ok) {
        setBackgroundName('');
        setBackgroundImage(null);
        document.querySelector('input[type="file"]').value = '';
        // Invalidate cache and refetch
        backgroundsCache = null;
        fetchBackgrounds();
      } else {
        const errorData = await response.json();
        setErrorMessage(errorData.error || t('ui.failedUploadBackground'));
      }
    } catch (error) {
      setErrorMessage(t('ui.errorUploadingBackground'));
    } finally {
      setUploading(false);
    }
  };

  const handleSetBackground = async (backgroundUrl) => {
    try {
      setSelectedBackground(backgroundUrl);
      applyBackground(backgroundUrl);
      localStorage.setItem('user_background', backgroundUrl);

      const { data: { session } } = await supabase.auth.getSession();
      await fetch('http://localhost:3001/api/backgrounds/preference', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ background_url: backgroundUrl })
      });
      
      // Update preference cache
      userPreferenceCache = { background_url: backgroundUrl };
    } catch (error) {
      // Silent fail
    }
  };

  const applyBackground = (url) => {
    const appRoot = document.getElementById('root');
    if (appRoot) {
      appRoot.style.backgroundImage = `url('${url}')`;
      appRoot.style.backgroundSize = 'cover';
      appRoot.style.backgroundPosition = 'center';
      appRoot.style.backgroundAttachment = 'fixed';
    }
  };

  const handleDeleteBackground = (backgroundId, backgroundUrl) => {
    setBackgroundToDelete({ id: backgroundId, url: backgroundUrl });
    setShowDeleteModal(true);
  };

  const confirmDeleteBackground = async () => {
    if (!backgroundToDelete) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`http://localhost:3001/api/backgrounds/${backgroundToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      if (response.ok) {
        if (selectedBackground === backgroundToDelete.url) {
          setSelectedBackground(null);
          const appRoot = document.getElementById('root');
          if (appRoot) appRoot.style.backgroundImage = '';
          localStorage.removeItem('user_background');
          // Clear preference cache
          userPreferenceCache = null;
        }
        setShowDeleteModal(false);
        setBackgroundToDelete(null);
        // Invalidate cache and refetch
        backgroundsCache = null;
        fetchBackgrounds();
      }
    } catch (error) {
      setErrorMessage('Failed to delete background');
    }
  };

  const cancelDeleteBackground = () => {
    setShowDeleteModal(false);
    setBackgroundToDelete(null);
  };

  return (
    <div className="backgrounds-tab">
      <form onSubmit={handleSubmit} className="background-form">
        {errorMessage && (
          <div className="message error-message">{errorMessage}</div>
        )}

        <div className="form-group">
          <input
            type="text"
            id="backgroundName"
            value={backgroundName}
            onChange={(e) => setBackgroundName(e.target.value)}
            placeholder={t('ui.backgroundName')}
            style={{
              backgroundColor: '#374151',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '14px',
              boxSizing: 'border-box',
              width: '100%'
            }}
          />
        </div>

        <div className="form-group">
          <input
            type="file"
            id="backgroundImage"
            accept="image/*"
            onChange={(e) => setBackgroundImage(e.target.files[0])}
            style={{
              backgroundColor: '#374151',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '14px',
              boxSizing: 'border-box',
              width: '100%'
            }}
          />
        </div>

        <button type="submit" className="submit-btn" disabled={uploading || !backgroundName || !backgroundImage}>
          {uploading ? t('ui.uploading') : t('ui.uploadBackground')}
        </button>
      </form>

      <div className="backgrounds-divider"></div>

      <div className="uploaded-backgrounds">
        <div className="background-list">
          {backgrounds.map((bg) => (
            <div key={bg.id} className="background-item">
              <button
                className="delete-background-btn"
                onClick={() => handleDeleteBackground(bg.id, bg.image_url)}
                title={t('ui.deleteBackground')}
              >
                ×
              </button>
              <div className="background-preview-wrapper">
                <img src={bg.image_url} alt={bg.name} className="background-preview" />
              </div>
              <p className="background-name">{bg.name}</p>
              <button
                className={`set-background-btn ${selectedBackground === bg.image_url ? 'active' : ''}`}
                onClick={() => handleSetBackground(bg.image_url)}
              >
                {selectedBackground === bg.image_url ? `✓ ${t('ui.active')}` : t('ui.setAsBackground')}
              </button>
            </div>
          ))}
        </div>
      </div>

      {showDeleteModal && (
        <div className="modal-overlay" onClick={cancelDeleteBackground}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{t('ui.deleteBackground')}</h3>
            <p>{t('ui.confirmDeleteBackground')}</p>
            
            <div className="modal-actions">
              <button 
                className="cancel-btn" 
                onClick={cancelDeleteBackground}
              >
                {t('ui.cancel')}
              </button>
              <button 
                className="delete-confirm-btn" 
                onClick={confirmDeleteBackground}
              >
                {t('ui.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Backgrounds;
