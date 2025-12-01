const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const isDev = process.env.NODE_ENV === 'development'
const { autoUpdater } = require('electron-updater')

// Auto-updater basic config
autoUpdater.allowDowngrade = false

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
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    icon: path.join(__dirname, '../assets/icon.png'),
    autoHideMenuBar: true,
  })

  // Set Content Security Policy
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.discord.com https://js.hcaptcha.com https://*.hcaptcha.com; " +
          "style-src 'self' 'unsafe-inline' https://*.discord.com https://*.hcaptcha.com; " +
          "img-src 'self' data: https:; " +
          "connect-src 'self' https://duelytics-app-production.up.railway.app https://onamlvzviwqkqlaejlra.supabase.co wss://onamlvzviwqkqlaejlra.supabase.co https://*.discord.com wss://*.discord.gg https://*.hcaptcha.com; " +
          "frame-src 'self' https://*.discord.com https://*.hcaptcha.com; " +
          "font-src 'self' data:;"
        ]
      }
    })
  })

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    // Open DevTools in development
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
    
    // Block DevTools keyboard shortcuts in production
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.control && input.shift && input.key.toLowerCase() === 'i') {
        event.preventDefault()
      }
      if (input.key.toLowerCase() === 'f12') {
        event.preventDefault()
      }
    })
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
app.whenReady().then(() => {
  createWindow()
  setupAutoUpdater()
})

function setupAutoUpdater() {
  if (isDev) return
  // Check for updates on app start and notify
  autoUpdater.checkForUpdatesAndNotify()

  // Notify renderer process about update availability
  autoUpdater.on('update-available', () => {
    if (mainWindow) {
      mainWindow.webContents.send('update-available')
    }
  })

  // Notify when update is downloaded and ready to install
  autoUpdater.on('update-downloaded', () => {
    if (mainWindow) {
      mainWindow.webContents.send('update-ready')
    }
  })

  // Handle update errors silently
  autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err)
  })
}

// Handle restart and install update from renderer
ipcMain.handle('app:install-update', () => {
  if (!isDev) autoUpdater.quitAndInstall()
})

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

// Listen for duel submissions from overlay (using send, not handle)
ipcMain.on('duel:submitted', (event, sessionId) => {
  // Notify main window to refresh the submission
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('duel:submitted', sessionId)
  }
})

// Handle language change from main window to overlay
ipcMain.handle('language:change', (event, language) => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('language:changed', language)
  }
})

// Window controls
ipcMain.handle('window:minimize', () => {
  if (mainWindow) mainWindow.minimize()
})

ipcMain.handle('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  }
})

ipcMain.handle('window:close', () => {
  if (mainWindow) mainWindow.close()
})

// Overlay window
function createOverlayWindow(params) {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.focus()
    return
  }
  
  overlayWindow = new BrowserWindow({
    width: 450,
    height: 420,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    movable: true,
    resizable: true,
    show: false
  })
  
  const overlayPath = path.join(__dirname, 'overlay', 'index.html')
  overlayWindow.loadFile(overlayPath, {
    query: {
      sessionId: params.sessionId,
      authToken: params.authToken,
      language: params.language || 'en'
    }
  })
  
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

ipcMain.handle('overlay:close', () => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.close()
  }
})

ipcMain.handle('overlay:resize', (event, { width, height }) => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    const currentSize = overlayWindow.getSize()
    const currentWidth = currentSize[0]
    const currentHeight = currentSize[1]
    
    const newWidth = width !== undefined ? width : currentWidth
    const newHeight = height !== undefined ? height : currentHeight
    
    // Set both minimum and maximum size to force the exact size
    overlayWindow.setMinimumSize(newWidth, newHeight)
    overlayWindow.setMaximumSize(newWidth, newHeight)
    overlayWindow.setSize(newWidth, newHeight, true)
    
    // Reset size constraints after a short delay
    setTimeout(() => {
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.setMinimumSize(100, 40) // Minimum size for minimized state
        overlayWindow.setMaximumSize(2000, 2000) // Generous maximum
      }
    }, 100)
  }
})

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (navigationEvent, navigationUrl) => {
    navigationEvent.preventDefault()
  })
})

// Periodically check for updates every hour
setInterval(() => {
  if (!isDev) {
    autoUpdater.checkForUpdates()
  }
}, 60 * 60 * 1000) // 1 hour
