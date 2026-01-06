const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const isDev = process.env.NODE_ENV === 'development'
const { autoUpdater } = require('electron-updater')

// Auto-updater basic config
autoUpdater.allowDowngrade = false

// Set as default protocol client for deep linking
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('duelytics', process.execPath, [path.resolve(process.argv[1])])
  }
} else {
  app.setAsDefaultProtocolClient('duelytics')
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
  process.exit(0)
}

let mainWindow
let overlayWindow
let deeplinkUrl = null

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
      sandbox: false, // Disabled for preload to work in development
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    icon: path.join(__dirname, '../assets/icon.ico'),
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

  // Intercept navigation to prevent OAuth from loading in app
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Handle deep links
    if (url.startsWith('duelytics://')) {
      event.preventDefault()
      handleDeepLink(url)
      return
    }
    
    // Open OAuth URLs in external browser
    if (url.includes('supabase.co/auth') || url.includes('discord.com/oauth2')) {
      event.preventDefault()
      require('electron').shell.openExternal(url)
      return
    }
  })
  
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('duelytics://')) {
      handleDeepLink(url)
      return { action: 'deny' }
    }
    // Open external links in system browser
    if (url.startsWith('http://') || url.startsWith('https://')) {
      require('electron').shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })
  
  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    // Open DevTools in development
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
    // Temporarily open DevTools in production for debugging
    mainWindow.webContents.openDevTools()
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    
    // If we have a pending deep link, handle it now
    if (deeplinkUrl) {
      handleDeepLink(deeplinkUrl)
      deeplinkUrl = null
    }
  })

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Handle deep link URLs on macOS
app.on('open-url', (event, url) => {
  event.preventDefault()
  if (mainWindow) {
    handleDeepLink(url)
  } else {
    deeplinkUrl = url
  }
})

// Handle deep link URLs on Windows
if (process.platform === 'win32') {
  const url = process.argv.find(arg => arg.startsWith('duelytics://'))
  if (url) {
    deeplinkUrl = url
  }
}

function handleDeepLink(url) {
  if (!mainWindow || mainWindow.isDestroyed()) return
  
  // Extract the callback URL and send it to the renderer
  mainWindow.webContents.send('deep-link', url)
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow()
  setupAutoUpdater()
})

function setupAutoUpdater() {
  if (isDev) {
    console.log('Auto-updater disabled in development')
    return
  }
  
  console.log('Setting up auto-updater...')
  console.log('Current version:', app.getVersion())
  
  // Check for updates on app start and notify
  autoUpdater.checkForUpdatesAndNotify()

  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for updates...')
  })

  // Notify renderer process about update availability
  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info)
    if (mainWindow) {
      mainWindow.webContents.send('update-available')
    }
  })

  autoUpdater.on('update-not-available', (info) => {
    console.log('Update not available:', info)
  })

  // Notify when update is downloaded and ready to install
  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded:', info)
    if (mainWindow) {
      mainWindow.webContents.send('update-ready')
    }
  })

  // Handle update errors
  autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err)
  })
}

// Handle restart and install update from renderer
ipcMain.handle('app:install-update', () => {
  if (!isDev) autoUpdater.quitAndInstall()
})

// Get app version
ipcMain.handle('app:get-version', () => {
  return app.getVersion()
})

// Handle manual check for updates
ipcMain.handle('app:check-for-updates', async () => {
  if (isDev) return { error: 'Updates not available in development' }
  console.log('Manual update check requested')
  try {
    const result = await autoUpdater.checkForUpdates()
    console.log('Manual update check result:', result)
    return { success: true, updateInfo: result?.updateInfo }
  } catch (err) {
    console.error('Manual update check error:', err)
    return { error: err.message }
  }
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

// Handle second instance (for deep links when app is already running)
app.on('second-instance', (event, commandLine) => {
  // Find the deep link URL in command line args
  const url = commandLine.find(arg => arg.startsWith('duelytics://'))
  if (url) {
    handleDeepLink(url)
  }
  
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

// Get fresh auth token from main window for overlay
ipcMain.handle('auth:getToken', async () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    // Ask the main window for a fresh token
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(null), 5000); // 5 second timeout
      
      ipcMain.once('auth:tokenResponse', (event, token) => {
        clearTimeout(timeout);
        resolve(token);
      });
      
      mainWindow.webContents.send('auth:requestToken');
    });
  }
  return null;
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
