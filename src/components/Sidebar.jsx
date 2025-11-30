import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import Logo from './Logo';

const languages = [
  { code: 'en', label: 'EN' },
  { code: 'ja', label: 'JP' },
  { code: 'zh', label: 'ZH' },
  { code: 'ko', label: 'KO' },
  { code: 'es', label: 'ES' },
  { code: 'de', label: 'DE' }
];

export function Sidebar({ activeTab = 'active-session', onTabChange = () => {}, userRoles = { isAdmin: false, isSupporter: false } }) {
  const { i18n } = useTranslation();
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [hoveredTab, setHoveredTab] = useState(null);

  const handleLanguageChange = (langCode) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('language', langCode);
    setShowLangDropdown(false);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const hasRole = (role) => {
    if (role === 'admin') return userRoles.isAdmin;
    if (role === 'supporter') return userRoles.isSupporter;
    return false;
  };

  const isTabAvailable = (tab) => {
    // Always available tabs
    if (tab === 'active-session' || tab === 'archive') return true;
    // Role-based tabs
    if (tab === 'background') return hasRole('supporter');
    if (tab === 'decks' || tab === 'create-session' || tab === 'manage-session') return hasRole('admin');
    return false;
  };

  // If current tab is not available, redirect to active-session
  if (!isTabAvailable(activeTab) && activeTab !== 'active-session') {
    onTabChange('active-session');
  }
  const handleTabClick = (tab) => {
    onTabChange(tab);
  };

  const getTabStyle = (tab) => {
    const isActive = activeTab === tab;
    return {
      backgroundColor: isActive ? 'rgba(200, 200, 200, 0.4)' : 'transparent',
      borderTop: 'none',
      borderRight: 'none',
      borderBottom: 'none',
      borderLeft: 'none',
      padding: '6px 8px',
      cursor: 'pointer',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      gap: 0,
      borderRadius: '6px',
    };
  };
  
  const getTabWrapperStyle = (tab) => {
    const isActive = activeTab === tab;
    return {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      position: 'relative',
    };
  };

  const tooltipStyle = {
    position: 'absolute',
    left: '72px',
    background: 'rgba(10, 10, 20, 0.8)',
    color: 'white',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '6px',
    padding: '4px 8px',
    fontSize: '11px',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    zIndex: 50,
  };
  
  const redLineStyle = {
    width: '2px',
    height: '32px',
    backgroundColor: '#ef4444',
    borderRadius: '1px',
    order: -1,
  };

  return (
    <aside 
      className="fixed left-0 top-0 h-screen w-16 flex flex-col items-center justify-center"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        width: '64px',
        height: '100vh',
        zIndex: 40,
        gap: '24px',
        position: 'relative'
      }}
    >
      {/* Logo - positioned at top */}
      <div style={{ position: 'absolute', top: '24px', width: '48px', height: '48px' }}>
        <Logo />
      </div>
      
      {/* Active Session */}
      {isTabAvailable('active-session') && (
        <div style={getTabWrapperStyle('active-session')} onMouseEnter={() => setHoveredTab('active-session')} onMouseLeave={() => setHoveredTab(null)}>
          {activeTab === 'active-session' && <div style={redLineStyle} />}
          <button onClick={() => handleTabClick('active-session')} style={getTabStyle('active-session')}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '32px', height: '32px', color: 'white' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 0 1 9 9v.375M10.125 2.25A3.375 3.375 0 0 1 13.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 0 1 3.375 3.375M9 15l2.25 2.25L15 12" />
            </svg>
          </button>
          {hoveredTab === 'active-session' && <div style={{ ...tooltipStyle, top: '0' }}>Active Session</div>}
        </div>
      )}
      
      {/* Archive */}
      {isTabAvailable('archive') && (
        <div style={getTabWrapperStyle('archive')} onMouseEnter={() => setHoveredTab('archive')} onMouseLeave={() => setHoveredTab(null)}>
          {activeTab === 'archive' && <div style={redLineStyle} />}
          <button onClick={() => handleTabClick('archive')} style={getTabStyle('archive')}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '32px', height: '32px', color: 'white' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
            </svg>
          </button>
          {hoveredTab === 'archive' && <div style={{ ...tooltipStyle, top: '0' }}>Archive</div>}
        </div>
      )}
      
      {/* Background */}
      {isTabAvailable('background') && (
        <div style={getTabWrapperStyle('background')} onMouseEnter={() => setHoveredTab('background')} onMouseLeave={() => setHoveredTab(null)}>
          {activeTab === 'background' && <div style={redLineStyle} />}
          <button onClick={() => handleTabClick('background')} style={getTabStyle('background')}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '32px', height: '32px', color: 'white' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />
            </svg>
          </button>
          {hoveredTab === 'background' && <div style={{ ...tooltipStyle, top: '0' }}>Backgrounds</div>}
        </div>
      )}
      
      {/* Spacer - show only if there are admin/supporter tabs */}
      {(isTabAvailable('decks') || isTabAvailable('create-session') || isTabAvailable('manage-session') || isTabAvailable('background')) && (
        <div style={{ height: '1px', width: '32px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
      )}
      
      {/* Decks */}
      {isTabAvailable('decks') && (
        <div style={getTabWrapperStyle('decks')} onMouseEnter={() => setHoveredTab('decks')} onMouseLeave={() => setHoveredTab(null)}>
          {activeTab === 'decks' && <div style={redLineStyle} />}
          <button onClick={() => handleTabClick('decks')} style={getTabStyle('decks')}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '32px', height: '32px', color: 'white' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5h-.75A2.25 2.25 0 0 0 4.5 9.75v7.5a2.25 2.25 0 0 0 2.25 2.25h7.5a2.25 2.25 0 0 0 2.25-2.25v-7.5a2.25 2.25 0 0 0-2.25-2.25h-.75m-6 3.75 3 3m0 0 3-3m-3 3V1.5m6 9h.75a2.25 2.25 0 0 1 2.25 2.25v7.5a2.25 2.25 0 0 1-2.25 2.25h-7.5a2.25 2.25 0 0 1-2.25-2.25v-.75" />
            </svg>
          </button>
          {hoveredTab === 'decks' && <div style={{ ...tooltipStyle, top: '0' }}>Decks</div>}
        </div>
      )}
      
      {/* Create Session */}
      {isTabAvailable('create-session') && (
        <div style={getTabWrapperStyle('create-session')} onMouseEnter={() => setHoveredTab('create-session')} onMouseLeave={() => setHoveredTab(null)}>
          {activeTab === 'create-session' && <div style={redLineStyle} />}
          <button onClick={() => handleTabClick('create-session')} style={getTabStyle('create-session')}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '32px', height: '32px', color: 'white' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
          {hoveredTab === 'create-session' && <div style={{ ...tooltipStyle, top: '0' }}>Create Session</div>}
        </div>
      )}
      
      {/* Manage Session */}
      {isTabAvailable('manage-session') && (
        <div style={getTabWrapperStyle('manage-session')} onMouseEnter={() => setHoveredTab('manage-session')} onMouseLeave={() => setHoveredTab(null)}>
          {activeTab === 'manage-session' && <div style={redLineStyle} />}
          <button onClick={() => handleTabClick('manage-session')} style={getTabStyle('manage-session')}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '32px', height: '32px', color: 'white' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
            </svg>
          </button>
          {hoveredTab === 'manage-session' && <div style={{ ...tooltipStyle, top: '0' }}>Manage Sessions</div>}
        </div>
      )}
      
      {/* Language Selector */}
      <div style={{ position: 'absolute', bottom: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={() => setShowLangDropdown(!showLangDropdown)}
          style={{
            backgroundColor: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '500',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = 'rgba(200, 200, 200, 0.2)';
            e.target.style.borderColor = 'rgba(255, 255, 255, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
            e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
          }}
        >
          {i18n.language.toUpperCase()}
        </button>

        {showLangDropdown && (
          <div style={{
            position: 'absolute',
            bottom: '40px',
            backgroundColor: 'rgba(10, 10, 20, 0.9)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '8px',
            padding: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            minWidth: '50px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}>
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                style={{
                  backgroundColor: i18n.language === lang.code ? 'rgba(239, 68, 68, 0.3)' : 'transparent',
                  border: 'none',
                  color: 'white',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  borderRadius: '4px',
                  transition: 'background-color 0.2s',
                  textAlign: 'center'
                }}
                onMouseEnter={(e) => !e.target.style.backgroundColor.includes('0.3') && (e.target.style.backgroundColor = 'rgba(200, 200, 200, 0.2)')}
                onMouseLeave={(e) => i18n.language !== lang.code && (e.target.style.backgroundColor = 'transparent')}
              >
                {lang.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Logout - positioned at bottom */}
      <button
        onClick={handleLogout}
        style={{
          position: 'absolute',
          bottom: '24px',
          backgroundColor: 'transparent',
          border: 'none',
          padding: '6px 8px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '6px',
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(200, 200, 200, 0.4)'}
        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '32px', height: '32px', color: 'white' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
        </svg>
      </button>

    </aside>
  );
}
