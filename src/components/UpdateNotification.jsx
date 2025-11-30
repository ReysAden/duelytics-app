import React from 'react'
import { useAutoUpdate } from '../hooks/useAutoUpdate'
import './UpdateNotification.css'

function UpdateNotification() {
  const { updateReady, installUpdate, setUpdateReady } = useAutoUpdate()

  if (!updateReady) return null

  return (
    <div className="update-notification">
      <div className="update-content">
        <div className="update-icon">↻</div>
        <div className="update-text">
          <div className="update-title">Update Available</div>
          <div className="update-message">A new version of Duelytics is ready to install</div>
        </div>
      </div>
      <div className="update-actions">
        <button 
          className="update-btn update-btn-dismiss"
          onClick={() => setUpdateReady(false)}
        >
          Later
        </button>
        <button 
          className="update-btn update-btn-install"
          onClick={installUpdate}
        >
          Restart & Install
        </button>
      </div>
    </div>
  )
}

export default UpdateNotification
