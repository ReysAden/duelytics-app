import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import './Backgrounds.css';

function Backgrounds({ user }) {
  const [backgroundName, setBackgroundName] = useState('');
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [backgrounds, setBackgrounds] = useState([]);
  const [selectedBackground, setSelectedBackground] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchBackgrounds();
    fetchUserPreference();
  }, [user]);

  const fetchBackgrounds = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('http://localhost:3001/api/backgrounds', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setBackgrounds(data);
      }
    } catch (error) {
      // Silent fail
    }
  };

  const fetchUserPreference = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('http://localhost:3001/api/backgrounds/preference', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
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
      setErrorMessage('Please provide both name and image');
      return;
    }

    setUploading(true);
    setErrorMessage('');

    try {
      // Compress image before upload
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
        fetchBackgrounds();
      } else {
        const errorData = await response.json();
        setErrorMessage(errorData.error || 'Failed to upload background');
      }
    } catch (error) {
      setErrorMessage('Error uploading background');
    } finally {
      setUploading(false);
    }
  };

  const handleSetBackground = async (backgroundUrl) => {
    try {
      // Apply immediately
      setSelectedBackground(backgroundUrl);
      applyBackground(backgroundUrl);
      localStorage.setItem('user_background', backgroundUrl);

      // Save to DB in background
      const { data: { session } } = await supabase.auth.getSession();
      await fetch('http://localhost:3001/api/backgrounds/preference', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ background_url: backgroundUrl })
      });
    } catch (error) {
      // Silent fail
    }
  };

  const applyBackground = (url) => {
    document.body.style.backgroundImage = `url('${url}')`;
  };

  const handleDeleteBackground = async (backgroundId, backgroundUrl) => {
    if (!confirm('Are you sure you want to delete this background?')) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`http://localhost:3001/api/backgrounds/${backgroundId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      if (response.ok) {
        // If the deleted background was active, clear it
        if (selectedBackground === backgroundUrl) {
          setSelectedBackground(null);
          document.body.style.backgroundImage = '';
          localStorage.removeItem('user_background');
        }
        fetchBackgrounds();
      }
    } catch (error) {
      setErrorMessage('Failed to delete background');
    }
  };

  return (
    <div className="backgrounds-tab">
      <form onSubmit={handleSubmit} className="background-form">
        <h2>Upload Background</h2>
        
        {errorMessage && (
          <div className="message error-message">{errorMessage}</div>
        )}

        <div className="form-group">
          <label htmlFor="backgroundName">Background Name</label>
          <input
            type="text"
            id="backgroundName"
            value={backgroundName}
            onChange={(e) => setBackgroundName(e.target.value)}
            placeholder="Enter background name"
          />
        </div>

        <div className="form-group">
          <label htmlFor="backgroundImage">Background Image</label>
          <input
            type="file"
            id="backgroundImage"
            accept="image/*"
            onChange={(e) => setBackgroundImage(e.target.files[0])}
          />
        </div>

        <button type="submit" className="submit-btn" disabled={uploading}>
          {uploading ? 'Uploading...' : 'Upload Background'}
        </button>
      </form>

      <div className="backgrounds-divider"></div>

      <div className="uploaded-backgrounds">
        <h3>Uploaded Backgrounds</h3>
        <div className="background-list">
          {backgrounds.map((bg) => (
            <div key={bg.id} className="background-item">
              <button
                className="delete-background-btn"
                onClick={() => handleDeleteBackground(bg.id, bg.image_url)}
                title="Delete background"
              >
                ×
              </button>
              <img src={bg.image_url} alt={bg.name} className="background-preview" />
              <p className="background-name">{bg.name}</p>
              <button
                className={`set-background-btn ${selectedBackground === bg.image_url ? 'active' : ''}`}
                onClick={() => handleSetBackground(bg.image_url)}
              >
                {selectedBackground === bg.image_url ? 'Active' : 'Set Background'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Backgrounds;
