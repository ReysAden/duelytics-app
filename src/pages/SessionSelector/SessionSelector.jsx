import './SessionSelector.css';
import { supabase } from '../../lib/supabase';
import { useState, useEffect } from 'react';
import CreateNewSession from './tabs/admin/CreateNewSession';
import ActiveSession from './tabs/user/ActiveSession';
import ArchiveSession from './tabs/user/ArchiveSession';
import ManageSessions from './tabs/admin/ManageSessions';
import Decks from './tabs/admin/Decks';
import Backgrounds from './tabs/supporter/Backgrounds';

function SessionSelector({ user, userRoles }) {
  const [activeTab, setActiveTab] = useState('Active Session');

  useEffect(() => {
    // Apply background from localStorage immediately (instant, no stutter)
    const cachedBackground = localStorage.getItem('user_background');
    if (cachedBackground) {
      document.body.style.backgroundImage = `url('${cachedBackground}')`;
    }

    // Fetch from DB in background to sync across devices
    const syncBackground = async () => {
      if (userRoles.isSupporter) {
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
              localStorage.setItem('user_background', data.background_url);
              document.body.style.backgroundImage = `url('${data.background_url}')`;
            }
          }
        } catch (error) {
          // Silent fail
        }
      }
    };

    syncBackground();
  }, [userRoles.isSupporter]);

  const handleLogout = async () => {
    localStorage.removeItem('user_background');
    await supabase.auth.signOut();
  };

  return (
    <>
      <aside className="sidebar">
        <h1 className="sidebar-title">Duelytics</h1>
        <p className="sidebar-subtitle">Select a session</p>
        
        <div className="sidebar-divider"></div>
        
        <nav className="sidebar-nav">
          <button 
            className={`sidebar-item ${activeTab === 'Active Session' ? 'active' : ''}`}
            onClick={() => setActiveTab('Active Session')}
          >
            Active Session
          </button>
          <button 
            className={`sidebar-item ${activeTab === 'Archive Session' ? 'active' : ''}`}
            onClick={() => setActiveTab('Archive Session')}
          >
            Archive Session
          </button>
          {userRoles.isSupporter && (
            <button 
              className={`sidebar-item ${activeTab === 'Backgrounds' ? 'active' : ''}`}
              onClick={() => setActiveTab('Backgrounds')}
            >
              Backgrounds
            </button>
          )}
        </nav>
        
        {userRoles.isAdmin && (
          <>
            <div className="sidebar-divider"></div>
            <nav className="sidebar-nav">
              <button 
                className={`sidebar-item ${activeTab === 'Create New Session' ? 'active' : ''}`}
                onClick={() => setActiveTab('Create New Session')}
              >
                Create New Session
              </button>
              <button 
                className={`sidebar-item ${activeTab === 'Manage Sessions' ? 'active' : ''}`}
                onClick={() => setActiveTab('Manage Sessions')}
              >
                Manage Sessions
              </button>
              <button 
                className={`sidebar-item ${activeTab === 'Decks' ? 'active' : ''}`}
                onClick={() => setActiveTab('Decks')}
              >
                Decks
              </button>
            </nav>
          </>
        )}
        
        <div className="sidebar-footer">
          <div className="sidebar-divider"></div>
          <button className="logout-btn" onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </aside>
      
      <main className="main-content">
        <header className="content-header">
          <h1 className="content-title">{activeTab}</h1>
        </header>
        <div className="content-body">
          {activeTab === 'Active Session' && <ActiveSession />}
          {activeTab === 'Archive Session' && <ArchiveSession />}
          {activeTab === 'Backgrounds' && <Backgrounds user={user} />}
          {activeTab === 'Create New Session' && <CreateNewSession />}
          {activeTab === 'Manage Sessions' && <ManageSessions />}
          {activeTab === 'Decks' && <Decks />}
          {activeTab !== 'Active Session' && activeTab !== 'Archive Session' && activeTab !== 'Backgrounds' && activeTab !== 'Create New Session' && activeTab !== 'Manage Sessions' && activeTab !== 'Decks' && (
            <p style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Content for {activeTab} coming soon...</p>
          )}
        </div>
      </main>
    </>
  );
}

export default SessionSelector;
