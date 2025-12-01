import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import './DiscordVerification.css';

function DiscordVerification() {
  const navigate = useNavigate();
  const { guildMemberVerified, verificationLoading, verifyGuildMembership, resetVerification } = useAuth();
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    checkMembership();
  }, []);

  const checkMembership = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/');
        return;
      }

      // Use cached verification, only make API call if not yet verified
      const isVerified = await verifyGuildMembership(session);
      
      if (isVerified) {
        navigate('/sessions');
      } else {
        // User not in guild - show verification screen
        // Extract user data from session
        setUser({
          username: session.user.user_metadata?.full_name || 'User'
        });
        setChecked(true);
      }
    } catch (err) {
      console.error('Failed to check membership:', err);
      setChecked(true);
    } finally {
      setRetrying(false);
    }
  };

  const handleRetry = async () => {
    setRetrying(true);
    // Clear verification cache before retry
    resetVerification();
    await checkMembership();
  };

  if (!checked) {
    return (
      <div className="discord-verification-container">
        <div className="discord-verification-modal">
          <div className="loading-spinner"></div>
          <p>Checking Discord membership...</p>
        </div>
      </div>
    );
  }

  const discordInvite = import.meta.env.VITE_DISCORD_INVITE || 'https://discord.gg/yourserver';

  return (
    <div className="discord-verification-container">
      <div className="discord-verification-modal">
        <h3>Discord Verification Required</h3>
        <p>You must be a member of our Discord server to use Duelytics.</p>

        <div className="verification-info">
          <div className="info-item">
            <span className="info-label">Logged in as:</span>
            <span className="info-value">{user?.username}</span>
          </div>
        </div>

        <div className="verification-steps">
          <strong>To continue:</strong>
          <ol>
            <li>Join our Discord server using the button below</li>
            <li>Come back and click "Retry Check"</li>
          </ol>
        </div>

        <div className="modal-actions">
          <a 
            href={discordInvite}
            target="_blank"
            rel="noopener noreferrer"
            className="discord-join-btn"
          >
            Join Discord Server
          </a>
          <button 
            onClick={handleRetry}
            disabled={retrying}
            className="retry-btn"
          >
            {retrying ? 'Checking...' : 'Retry Check'}
          </button>
          <button
            onClick={() => {
              supabase.auth.signOut();
              navigate('/');
            }}
            className="logout-btn"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default DiscordVerification;
