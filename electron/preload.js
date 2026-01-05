const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  checkForUpdates: () => ipcRenderer.invoke('app:check-for-updates'),
  
  // Window controls
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  
  // File operations (if needed later)
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (data) => ipcRenderer.invoke('dialog:saveFile', data),
  
  // Overlay window
  overlay: {
    open: (params) => ipcRenderer.invoke('overlay:open', params),
    close: () => ipcRenderer.invoke('overlay:close'),
    resize: (size) => ipcRenderer.invoke('overlay:resize', size),
  },
  
  // Auth
  auth: {
    getToken: () => ipcRenderer.invoke('auth:getToken'),
    onTokenRequest: (callback) => ipcRenderer.on('auth:requestToken', callback),
    sendToken: (token) => ipcRenderer.send('auth:tokenResponse', token),
  },
  
  // IPC communication
  ipcRenderer: {
    send: (channel, data) => ipcRenderer.send(channel, data),
  },
  
  // Duel submission notification
  notifyDuelSubmitted: (sessionId) => ipcRenderer.invoke('duel:submitted', sessionId),
  
  // Language change notification
  notifyLanguageChange: (language) => ipcRenderer.invoke('language:change', language),
  
  // Listen to events from main process
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onUpdateReady: (callback) => ipcRenderer.on('update-ready', callback),
  installUpdate: () => ipcRenderer.invoke('app:install-update'),
  onDuelSubmitted: (callback) => ipcRenderer.on('duel:submitted', (event, sessionId) => callback(sessionId)),
  onLanguageChange: (callback) => ipcRenderer.on('language:changed', (event, language) => callback(language)),
  
  // Deep link handler for OAuth
  onDeepLink: (callback) => {
    const listener = (event, url) => callback(url)
    ipcRenderer.on('deep-link', listener)
    return () => ipcRenderer.removeListener('deep-link', listener)
  },
})

// Expose a simple flag to detect Electron environment and shell utilities
contextBridge.exposeInMainWorld('electron', {
  isElectron: true,
  openExternal: (url) => {
    const { shell } = require('electron')
    return shell.openExternal(url)
  }
})
