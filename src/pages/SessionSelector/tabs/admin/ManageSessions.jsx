import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../../lib/supabase';
import { useSessionContext } from '../../../../contexts/SessionContext';
import './ManageSessions.css';
import { API_URL } from '../../../../config/api';

function ManageSessions() {
  const { t } = useTranslation(['common']);
  const { refreshSessions } = useSessionContext();
  const [activeSessions, setActiveSessions] = useState([]);
  const [archivedSessions, setArchivedSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(''); // 'active' or 'archived'
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteAction, setDeleteAction] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchSessions();
    
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSessions = async () => {
    try {
      const [activeRes, archivedRes] = await Promise.all([
        fetch(`${API_URL}/sessions?status=active`),
        fetch(`${API_URL}/sessions?status=archived`)
      ]);
      
      const activeData = await activeRes.json();
      const archivedData = await archivedRes.json();
      
      if (activeData.sessions) setActiveSessions(activeData.sessions);
      if (archivedData.sessions) setArchivedSessions(archivedData.sessions);
    } catch (err) {
      setError(t('ui.failedLoadSessions'));
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!selectedSession) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError(t('common.notAuthenticated'));
        return;
      }

      const response = await fetch(`${API_URL}/admin/sessions/${selectedSession}/archive`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('ui.failedArchiveSession'));
      }

      setSuccess(t('ui.archived'));
      setSelectedSession('');
      setSelectedStatus('');
      refreshSessions(); // Refresh context
      fetchSessions(); // Refresh list
    } catch (err) {
      setError(err.message || t('ui.failedArchiveSession'));
    }
  };

  const handleDelete = () => {
    setDeleteAction('delete');
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedSession) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError(t('common.notAuthenticated'));
        return;
      }

      const response = await fetch(`${API_URL}/admin/sessions/${selectedSession}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('ui.failedDeleteSession'));
      }

      setSuccess(t('ui.deleted'));
      setSelectedSession('');
      setSelectedStatus('');
      setShowDeleteModal(false);
      setDeleteAction(null);
      refreshSessions(); // Refresh context
      fetchSessions();
    } catch (err) {
      setError(err.message || t('ui.failedDeleteSession'));
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteAction(null);
  };

  if (loading) {
    return <div className="manage-sessions">{t('ui.loadingSessions')}</div>;
  }

  const selectedSessionData = [...activeSessions, ...archivedSessions].find(s => s.id === parseInt(selectedSession));
  const allSessions = [...activeSessions, ...archivedSessions].map(s => ({ ...s, status: activeSessions.some(a => a.id === s.id) ? 'active' : 'archived' }));

  return (
    <div className="manage-sessions">
      {success && <div className="message success-message">{success}</div>}

      <div className="session-selector">
        <div className="dropdown-container" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className={`dropdown-button ${showDropdown ? 'open' : ''}`}
          >
            <span className="dropdown-label">
              {selectedSessionData
                ? `${selectedSessionData.name} (${selectedSessionData.game_mode})`
                : t('ui.chooseSession')
              }
            </span>
            <svg className="dropdown-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06-.02L10 10.67l3.71-3.48a.75.75 0 111.02 1.1l-4.2 3.94a.75.75 0 01-1.02 0L5.25 8.29a.75.75 0 01-.02-1.08z" clipRule="evenodd"/>
            </svg>
          </button>

          {showDropdown && (
            <div className="dropdown-panel" role="menu" aria-hidden={!showDropdown}>
              <ul className="dropdown-list">
                {allSessions.length === 0 ? (
                  <li className="dropdown-empty">{t('ui.noSessionsAvailable')}</li>
                ) : (
                  allSessions.map((session) => (
                    <li key={session.id} role="menuitem">
                      <button
                        className="dropdown-option"
                        onClick={() => {
                          setSelectedSession(session.id);
                          setSelectedStatus(session.status);
                          setShowDropdown(false);
                        }}
                      >
                        <div className="session-name">{session.name}</div>
                        <div className="session-mode">{t('ui.mode')}: {session.game_mode} • {session.status}</div>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      {selectedSession && (
        <div className="action-buttons">
          {selectedStatus === 'active' && (
            <button className="action-btn archive-btn" onClick={handleArchive}>
              {t('ui.archive')}
            </button>
          )}
          <button className="action-btn session-delete-btn" onClick={handleDelete}>
            {t('ui.delete')}
          </button>
        </div>
      )}

      {showDeleteModal && deleteAction === 'delete' && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{t('ui.deleteSession')}</h3>
            <p>{t('ui.confirmDeleteSession')}</p>
            
            <div className="modal-actions">
              <button 
                className="cancel-btn" 
                onClick={cancelDelete}
              >
                {t('ui.cancel')}
              </button>
              <button 
                className="delete-confirm-btn" 
                onClick={confirmDelete}
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

export default ManageSessions;
