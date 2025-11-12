import './Browse.css';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import PersonalStats from './PersonalStats/PersonalStats';

function Browse({ sessionData }) {
  const { sessionId } = useParams();
  const [participants, setParticipants] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userSearch, setUserSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchParticipants();
  }, [sessionId]);

  const fetchParticipants = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`http://localhost:3001/api/sessions/${sessionId}/participants`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      
      const data = await response.json();
      if (data.participants) {
        setParticipants(data.participants);
      }
    } catch (err) {
      console.error('Failed to load participants:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredParticipants = participants.filter(participant =>
    participant.username.toLowerCase().includes(userSearch.toLowerCase())
  );

  if (loading) {
    return <div className="browse-container">Loading participants...</div>;
  }

  return (
    <div className="browse-container">
      {!selectedUser ? (
        <div className="user-selector">
          <h2>Browse User Stats</h2>
          <p className="subtitle">Select a user to view their stats from this session</p>
          
          <div className="combobox">
            <input
              type="text"
              className="field-select"
              placeholder="Search for a user..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              onClick={() => setShowDropdown(!showDropdown)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            />
            <svg className={`dropdown-icon ${showDropdown ? 'open' : ''}`} width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {showDropdown && filteredParticipants.length > 0 && (
              <div className="dropdown">
                {filteredParticipants.map(participant => (
                  <div
                    key={participant.user_id}
                    className="dropdown-item"
                    onMouseDown={() => {
                      setSelectedUser(participant);
                      setUserSearch('');
                      setShowDropdown(false);
                    }}
                  >
                    {participant.username}
                  </div>
                ))}
              </div>
            )}
          </div>

          {participants.length === 0 && (
            <p className="no-participants">No participants found in this session</p>
          )}
        </div>
      ) : (
        <div className="user-stats-view">
          <div className="user-stats-header">
            <button className="back-to-browse" onClick={() => setSelectedUser(null)}>
              ← Back to Browse
            </button>
            <h2>Viewing stats for: {selectedUser.username}</h2>
          </div>
          <PersonalStats sessionData={sessionData} targetUserId={selectedUser.user_id} />
        </div>
      )}
    </div>
  );
}

export default Browse;
