const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  
  // Window controls
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  
  // File operations (if needed later)
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (data) => ipcRenderer.invoke('dialog:saveFile', data),
  
  // Overlay
  overlay: {
    open: (sessionId) => ipcRenderer.invoke('overlay:open', sessionId),
    resize: (size) => ipcRenderer.invoke('overlay:resize', size),
    close: () => ipcRenderer.invoke('overlay:close'),
  },
  
  // Duel submission notification
  notifyDuelSubmitted: (sessionId) => ipcRenderer.invoke('duel:submitted', sessionId),
  
  // Listen to events from main process
  onUpdateAvailable: (callback) => ipcRenderer.on('update:available', callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update:downloaded', callback),
  onDuelSubmitted: (callback) => ipcRenderer.on('duel:submitted', (event, sessionId) => callback(sessionId)),
})
