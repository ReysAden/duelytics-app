import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import './AboutModal.css';

export default function AboutModal({ isOpen, onClose }) {
  const [version, setVersion] = useState('Loading...');
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (isOpen && window.electronAPI?.getVersion) {
      window.electronAPI.getVersion()
        .then(v => setVersion(v || 'Unknown'))
        .catch(err => {
          console.error('Failed to get version:', err);
          setVersion('Unknown');
        });
    } else if (isOpen) {
      setVersion('Web version');
    }
  }, [isOpen]);

  const handleCheckForUpdates = async () => {
    if (!window.electronAPI?.checkForUpdates) {
      toast.error('Update checking not available');
      return;
    }

    setChecking(true);
    try {
      const result = await window.electronAPI.checkForUpdates();
      
      if (result.error) {
        toast.error(result.error);
      } else if (result.success) {
        toast.success('Checking for updates... You will be notified if an update is available.');
      }
    } catch (err) {
      toast.error('Failed to check for updates');
    } finally {
      setChecking(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Check for Updates</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="about-section">
            <p className="version-text">Current Version: {version || 'Unknown'}</p>
          </div>

          <div className="update-section">
            <p className="update-info">
              Click below to check for updates. If an update is available, you'll be prompted to download and install it.
            </p>
            <button 
              className="check-update-btn"
              onClick={handleCheckForUpdates}
              disabled={checking}
            >
              {checking ? 'Checking...' : 'Check for Updates'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
