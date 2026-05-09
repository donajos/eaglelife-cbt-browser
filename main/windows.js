const { BrowserWindow } = require('electron');
const path = require('path');
const store = require("./services/storeServices");
const registerIPC = require("./ipc");
const { PRELOAD } = require("./paths");

preload: PRELOAD


let configWindow;
let startWindow;
let examWindow;

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
            preload: path.join(__dirname, '..', 'preload.js')
        }
    });

    configWindow.setMenu(null);
    configWindow.loadFile(path.join(__dirname, "..", "renderer", "server.html"));
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
            preload: path.join(__dirname, '..', 'preload.js')
        }
    });

    startWindow.setMenu(null);
    startWindow.loadFile(path.join(__dirname, "..", "renderer", "start.html"));

    // Prevent new windows
    startWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    startWindow.webContents.on('context-menu', e => e.preventDefault());
    startWindow.on('ready-to-show', () => {
        startWindow.show();
        startWindow.focus();
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
                preload: path.join(__dirname, '..', 'preload.js')
            },
            resizable: false,
        });

        modal.loadFile(path.join(__dirname, "..", "renderer", "showModal.html"));

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

function focusExamWindow() {

    if (examWindow) {

        if (examWindow.isMinimized()) {
            examWindow.restore();
        }

        examWindow.focus();
    }
}


function initWindows() {
    createConfigWindow();
}

module.exports = {
    initWindows,
    createStartWindow,
    createExamWindow,
    focusExamWindow
};