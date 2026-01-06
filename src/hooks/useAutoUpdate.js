import { useEffect, useState } from 'react'

/**
 * Hook to handle auto-update notifications
 * Shows when an update is available and ready to install
 */
export function useAutoUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateReady, setUpdateReady] = useState(false)

  useEffect(() => {
    if (!window.electronAPI) return

    // Listen for update available (downloading in background)
    window.electronAPI.onUpdateAvailable(() => {
      setUpdateAvailable(true)
    })

    // Listen for update ready (downloaded, ready to install)
    window.electronAPI.onUpdateReady(() => {
      setUpdateReady(true)
    })
  }, [])

  const installUpdate = async () => {
    if (window.electronAPI?.installUpdate) {
      await window.electronAPI.installUpdate()
    }
  }

  return {
    updateAvailable,
    updateReady,
    installUpdate,
    setUpdateAvailable,
    setUpdateReady
  }
}
