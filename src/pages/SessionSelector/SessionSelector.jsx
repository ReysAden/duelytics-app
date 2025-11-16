import { useState } from 'react';
import { Sidebar } from '../../components/Sidebar';
import { TabHeader } from '../../components/TabHeader';
import { SessionProvider } from '../../contexts/SessionContext';
import ActiveSession from './tabs/user/ActiveSession';
import ArchiveSession from './tabs/user/ArchiveSession';
import Backgrounds from './tabs/supporter/Backgrounds';
import Decks from './tabs/admin/Decks';
import CreateNewSession from './tabs/admin/CreateNewSession';
import ManageSessions from './tabs/admin/ManageSessions';

function SessionSelector({ user, userRoles }) {
  const [activeTab, setActiveTab] = useState('active-session');

  const hasRole = (role) => {
    if (!userRoles) return false;
    if (role === 'admin') return userRoles.isAdmin;
    if (role === 'supporter') return userRoles.isSupporter;
    return false;
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'active-session':
        return <ActiveSession />;
      case 'archive':
        return <ArchiveSession />;
      case 'background':
        return hasRole('supporter') ? <Backgrounds /> : <div className="p-8 text-white/50">Access denied</div>;
      case 'decks':
        return hasRole('admin') ? <Decks /> : <div className="p-8 text-white/50">Access denied</div>;
      case 'create-session':
        return hasRole('admin') ? <CreateNewSession /> : <div className="p-8 text-white/50">Access denied</div>;
      case 'manage-session':
        return hasRole('admin') ? <ManageSessions /> : <div className="p-8 text-white/50">Access denied</div>;
      default:
        return null;
    }
  };

  return (
    <SessionProvider>
      <div className="h-screen w-screen flex">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} userRoles={userRoles} />
        <main className="flex-1 h-screen overflow-y-auto">
          <TabHeader tabName={activeTab} />
          <div className="px-8 py-6">
            {renderTabContent()}
          </div>
        </main>
      </div>
    </SessionProvider>
  );
}

export default SessionSelector;
