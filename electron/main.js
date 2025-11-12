const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const isDev = process.env.NODE_ENV === 'development'

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
  process.exit(0)
}

let mainWindow
let overlayWindow

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 950,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false, // Don't show until ready
    titleBarStyle: 'default',
    icon: path.join(__dirname, '../assets/icon.png'),
    autoHideMenuBar: true, // Hide menu bar
  })

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    // Open DevTools in development
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// This method will be called when Electron has finished initialization
app.whenReady().then(createWindow)

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// Handle second instance
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

// Overlay window
function createOverlayWindow(params) {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.focus()
    return
  }

  overlayWindow = new BrowserWindow({
    width: 320,
    height: 420,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    show: false
  })

  const overlayPath = path.join(__dirname, '../electron/overlay.html')
  const query = {
    sessionId: params.sessionId,
    authToken: params.authToken
  }
  overlayWindow.loadFile(overlayPath, { query })

  overlayWindow.once('ready-to-show', () => {
    overlayWindow.show()
  })

  overlayWindow.on('closed', () => {
    overlayWindow = null
  })
}

ipcMain.handle('overlay:open', (event, params) => {
  createOverlayWindow(params)
})

ipcMain.handle('overlay:resize', (event, { width, height }) => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.setSize(width, height)
  }
})

ipcMain.handle('overlay:close', (event) => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.close()
    overlayWindow = null
  }
})

ipcMain.handle('duel:submitted', (event, sessionId) => {
  // Notify main window to refresh the submission
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('duel:submitted', sessionId)
  }
})

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (navigationEvent, navigationUrl) => {
    navigationEvent.preventDefault()
  })
})
