//main.js

const { autoUpdater } = require("electron-updater");

const Store = require('electron-store').default;
const store = new Store();
const axios = require("axios");
const { app, BrowserWindow, ipcMain } = require('electron');
const currentVersion = app.getVersion();
const semver = require('semver');
const log = require("electron-log");

const path = require('path');
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (examWindow) {
            if (examWindow.isMinimized()) examWindow.restore();
            examWindow.focus();
        }
    });
}


autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = "info";
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;





let configWindow;
let startWindow;
let examWindow;
let serverIP = '';
let reconnectTimer = null;
let retryInterval = null;
let lastExamURL = null;
let serverReachable = true; // track server state
let appLock = false; // track if client should be locked to exam


function safeSend(channel, data = null) {
    try {
        if (
            examWindow &&
            !examWindow.isDestroyed() &&
            examWindow.webContents &&
            !examWindow.webContents.isDestroyed()
        ) {
            examWindow.webContents.send(channel, data);
        }
    } catch (err) {
        console.log("safeSend skipped:", err.message);
    }
}

function createConfigWindow() {
    configWindow = new BrowserWindow({
        width: 400,
        height: 200,
        resizable: false,
        maximizable: false,
        minimizable: false,
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    configWindow.setMenu(null);
    configWindow.loadFile('server.html');
    //configWindow.webContents.openDevTools();
}

function createStartWindow() {
    startWindow = new BrowserWindow({
        fullscreen: true,
        resizable: false,
        frame: false,
        autoHideMenuBar: true,
        center:true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    startWindow.setMenu(null);
    startWindow.loadFile('start.html');

    // Prevent new windows
    startWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    startWindow.webContents.on('context-menu', e => e.preventDefault());
    startWindow.on('ready-to-show', () => {
        startWindow.show();
        startWindow.focus();
    });
    
    
}

async function checkServer(host) {
    try {
        const response = await fetch(`http://${host}/cbtexam/`, {
            method: 'HEAD'
        });

        return response.ok;
    } catch (err) {
        throw err;
    }
}

/* const net = require('net');

function checkServer(host, port, timeout = 2000) {
    return new Promise((resolve, reject) => {
        const socket = new net.Socket();
        socket.setTimeout(timeout);
        socket.on('connect', () => {
            socket.destroy();
            resolve(true);
        });
        socket.on('error', () =>{socket.destroy(); reject(false);});
        socket.on('timeout', () =>{socket.destroy(); reject(false);});
        socket.connect(port, host);
    });
}  */


/* async function tryNavigate(url) {
    try {
        await checkServer(serverIP, 80);
        serverReachable = true;
        examWindow.loadURL(url);
    } catch {
        serverReachable = false;
        lastExamURL = url;
        examWindow.webContents.send('network-offline'); // show overlay
    }
} */

let kioskMode = true; // default to kiosk mode, can be toggled in future

function kiosksMode() {

    
    examWindow = new BrowserWindow({
        kiosk: true,
        fullscreen: true,
        minimizable: false,
        maximizable: true, // allow maximize for better multi-monitor support
        frame: false,
        resizable: false,
        autoHideMenuBar: true,
        center: true,
        alwaysOnTop: true,
        skipTaskbar: true, // Windows/Linux
        fullscreen: true,
        focusable: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            devTools: false
        }
    });
    examWindow.setKiosk(true);
    examWindow.on('minimize', (e) => {
        e.preventDefault();
    });
    

    // Prevent new windows and context menu
    examWindow.webContents.setWindowOpenHandler(({ url }) => {
        // Only allow the server hostname
        try {
            return (new URL(url).hostname === serverIP) ? { action: 'allow' } : { action: 'deny' };
        } catch {
            return { action: 'deny' }; // blocks everything else
        }
        
    });
    examWindow.webContents.on('context-menu', e => e.preventDefault());

    // Block dangerous keyboard shortcuts
    examWindow.webContents.on('before-input-event', (event, input) => {
        if (
            input.key === 'F12' ||
            (input.control && input.shift && input.key.toLowerCase() === 'i') ||
            (input.control && input.key.toLowerCase() === 'r') ||
            (input.control && input.key.toLowerCase() === 'w') ||
            (input.alt && input.key === 'F4') ||
            (input.meta && input.key.toLowerCase() === 'q') ||
            (input.control && input.meta && input.key.toLowerCase === 'd' ) ||
            (input.meta && input.key.toLowerCase() === 'd' ) ||
            input.meta
        ) {
            event.preventDefault();
        }
    });

}

function noKiosksMode() {

    examWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        resizable: true,
        maximizable: true,
        minimizable: true,
        fullscreen: false,
        frame: true,   //  Native OS controls
        autoHideMenuBar: false,
        center: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });
}
    


async function createExamWindow() {
    

    if (!kioskMode){
        return noKiosksMode();
    }else {     
        kiosksMode();
    }
    const examURL = `http://${serverIP}/cbtexam/my/`;
    lastExamURL = lastExamURL || examURL;

    // loading url with error handling to update serverReachable state
    const safeLoadURL = async (url) => {
        try {
            await examWindow.loadURL(url);
        } catch {
            // Ignore load errors, overlay will handle offline
        }
    };

    // Try initial load
    try {
        await checkServer(serverIP);
        serverReachable = true;
        await safeLoadURL(lastExamURL);
        safeSend('network-online');
            
        
    } catch {
        serverReachable = false;
        // Keep lastExamURL; overlay shows offline
        safeSend('network-offline');
        
        await safeLoadURL(lastExamURL); // attempt load, ignore errors
    }

    // Track last navigated URL
    examWindow.webContents.on('did-navigate', (event, url, isMainFrame) => {
        if (isMainFrame) lastExamURL = url;
    });
    examWindow.webContents.on('did-navigate-in-page', (event, url) => {
        lastExamURL = url;
    });

    // Block navigation to external URLs
    const blockExternal = (event, url) => {
        try {
            const hostname = new URL(url).hostname;
            if (hostname !== serverIP || !serverReachable) {
                event.preventDefault();
                if (!serverReachable) safeSend('network-offline');
            }
        } catch {
            event.preventDefault();
        }
    };
    // Block redirects to external sites
    examWindow.webContents.on('will-redirect', blockExternal);
    examWindow.webContents.on('will-navigate', blockExternal);

    // Handle failed page loads
    examWindow.webContents.on('did-fail-load', (event, errorCode, errorDesc, validatedURL, isMainFrame) => {
        console.error(`Failed to load ${validatedURL}: ${errorCode} ${errorDesc}`);
        if (!isMainFrame || errorCode === -3) return; // ignore aborted
        serverReachable = false;
        lastExamURL = validatedURL;
        safeSend('network-offline');
    });

    // Retry loop every 2s with reconnection flag to prevent overlaps
    reconnectLoop();

    // Auto-focus exam window with debounce to prevent focus loops
    let lastFocusTime = 0;
    examWindow.on('blur', () => {
        const now = Date.now();
        if (now - lastFocusTime > 100) {
            lastFocusTime = now;
            if (examWindow && !examWindow.isDestroyed()){
                examWindow.show();
                examWindow.focus();
                examWindow.setAlwaysOnTop(true);
            } 
        }
    });
    examWindow.on('ready-to-show', () => {
        examWindow.show();
        examWindow.focus();
    });
    

     // Handle window close
    examWindow.on('closed', () => {
        reconnecting = false;
        examWindow = null;

        // Auto-reopen only if not during quit or update
        if (!app.isQuitting) {
            setTimeout(() => {
                if (!examWindow) createExamWindow();
            }, 1000);
        }

        if (store.get('pendingUpdate')) {
            autoUpdater.quitAndInstall();
        }
    });
}

let reconnecting = false;

async function reconnectLoop() {

    if (!examWindow || examWindow.isDestroyed()) return;
    if (reconnecting) return;

    reconnecting = true;

    try {
        await checkServer(serverIP);

        if (!serverReachable) {
            serverReachable = true;
            safeSend('network-online');
        }

        // Reload only if current page is blank/error
        const currentURL = examWindow.webContents.getURL();

        if (!currentURL || currentURL.startsWith('chrome-error://') || currentURL === 'about:blank') {
            await safeLoadURL(lastExamURL);
        }

    } catch {
        serverReachable = false;
        safeSend('network-offline');

    } finally {
        reconnecting = false;

        reconnectTimer = setTimeout(reconnectLoop, 2000);
    }
}



function showMessage(message) {
    return new Promise((resolve) => {

        const parent = BrowserWindow.getFocusedWindow(); 
        const modal = new BrowserWindow({
            width: 300,
            height: 150,
            modal: true,
            parent: parent || undefined,
            autoHideMenuBar: true,
            frame: false,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'preload.js')
            },
            resizable: false,
        });

        modal.loadFile('showModal.html');

        // When modal is ready, send the message
         modal.webContents.on('did-finish-load', () => {
            modal.webContents.send('show-message', message);
        }); 

        // Resolve promise when user clicks OK
        ipcMain.once('modal-closed', () => {
            modal.close();
            resolve();
        });
    });
}

function setupAutoUpdater() {
    serverIP = store.get('serverIP');

    if (!serverIP) return;

    autoUpdater.setFeedURL({
        provider: "generic",
        url: `http://${serverIP}/updates/`
    });

    if (!store.get('updateChecked')) {
        autoUpdater.checkForUpdates();
        store.set('updateChecked', true);
    }
        
}

let serverCommandInterval = null;

function checkServerCommands() {

    if (serverCommandInterval) return; // already running

    serverCommandInterval = setInterval(async () => {
        // skip check if examWindow is open
        if (examWindow && !examWindow.isDestroyed()) return;

        try {
            const res = await axios.get(`http://${serverIP}/updates/api/system-status.php`);

            if (res.data.examActive) {
                kioskMode = true;
            } else {
                kioskMode = false;
            }
            if (res.data.lockClient) {
                appLock = true;
            } else {
                appLock = false;
            }
            if(res.data.shutdown){
                app.quit();
            }


        } catch (err) {
            console.log("Failed to check server version:", err.message);
        }
    }, 60000); // every 60 seconds
}

app.whenReady().then(() => {

    
    store.set('updateChecked', false); // reset for new session
    createConfigWindow();
    
});
/* 
ipcMain.on('server-ip-submitted', () => {
    if (ip && ip.trim() !== '') {
        serverIP = ip.trim();
        createStartWindow();
        configWindow.close();
    }
}); */



ipcMain.on('save-ip', (event, ip) => {
    
    if (ip && ip.trim() !== '') {
        store.set('serverIP', ip.trim());
        serverIP = ip.trim();

        setupAutoUpdater();
        checkServerCommands();

        createStartWindow();
        configWindow.destroy();
    }
});

ipcMain.handle('get-ip', () => {
    return store.get('serverIP');
});

ipcMain.on('start', () => {
   
    // Instead of a new window, just load the next file in the SAME window
    if (startWindow) {
        startWindow.loadFile('login.html');
    }
    
});

ipcMain.handle('get-version', () => {
    return currentVersion;
});

ipcMain.handle('exam-login', async () => {
    if (!startWindow) return { success: false };

    try {
         if (!examWindow) {
            await autoUpdater.checkForUpdates();
        }       
        // Check if server is reachable
        await checkServer(serverIP);

        // Close the start window and open the exam window
        startWindow.close();
        createExamWindow();

        return { success: true };
    } catch {
        // Show modal if server unreachable
        await showMessage("Cannot reach server");
        return { success: false };
    }
});

/* ipcMain.on('network-online', async () => {
        
    if (!examWindow || examWindow.isDestroyed()) return;
    try {
        await checkServer(serverIP, 80);
        const targetURL = lastExamURL || `http://${serverIP}/cbtexam/my/`;
        examWindow.loadURL(targetURL);
        
    } catch {
      // server still unreachable
    }
});
    
ipcMain.on('network-offline', () => {
    console.log("Network disconnected");
        
}); */




ipcMain.on('show-message', async (event, message) => {
    const parent = configWindow || startWindow; // whichever window is open
    try {
        await showMessage(message);   //  pass parent here
    } catch (err) {
        console.error('Failed to show modal:', err);
    }
});


autoUpdater.on('checking-for-update', () => {
    console.log('Checking for update...');
});

autoUpdater.on('update-available', () => {
    console.log('Update available.');
});

autoUpdater.on('update-not-available', () => {
    console.log('No update available.');
});

autoUpdater.on('download-progress', (progressObj) => {
    console.log(`Download speed: ${progressObj.bytesPerSecond}`);
});

autoUpdater.on('update-downloaded', () => {
    console.log('Update downloaded');
    
    if (!examWindow) {
        autoUpdater.quitAndInstall();
    }else {
        //install after exam window closes
        store.set('pendingUpdate', true);
    }
});



app.on('window-all-closed', () => {
    if (serverCommandInterval) {
        clearInterval(serverCommandInterval);
        serverCommandInterval = null;
    }

    if (process.platform !== 'darwin') app.quit();
});