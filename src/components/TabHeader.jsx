import { useTranslation } from 'react-i18next';
import Logo from './Logo';

export function TabHeader({ tabName }) {
  const { t } = useTranslation(['common']);

  const getTabDisplayName = (tab) => {
    const nameMap = {
      'active-session': t('sessionSelector.activeSession'),
      'archive': t('sessionSelector.archiveSession'),
      'background': t('sessionSelector.backgrounds'),
      'decks': t('sessionSelector.decks'),
      'create-session': t('sessionSelector.createNewSession'),
      'manage-session': t('sessionSelector.manageSessions')
    };
    return nameMap[tab] || tab;
  };

  return (
    <div className="flex justify-center" style={{ paddingTop: '24px', paddingBottom: '24px' }}>
      <div 
        style={{
          backgroundColor: 'rgba(10, 10, 20, 0.7)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '8px 16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
        }}
      >
        <h2 style={{
          color: 'rgba(255, 255, 255, 0.95)',
          fontSize: '16px',
          fontWeight: '600',
          margin: 0,
          letterSpacing: '0.5px'
        }}>
          {getTabDisplayName(tabName)}
        </h2>
      </div>
    </div>
  );
}
