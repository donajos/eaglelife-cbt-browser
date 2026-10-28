//kiosk.js

const { BrowserWindow, app } = require('electron');
const path = require('path');
const { PRELOAD } = require("./paths");
const { checkServer, reconnectLoop, initNetwork, safeSend } = require("./network");
const store = require("./services/storeServices");
const { autoUpdater } = require("electron-updater");
let kioskMode = true; // default to kiosk mode, can be toggled
let examWindow;
let serverReachable;
let lastExamURL; // track last navigated URL for reloads
preload: PRELOAD
let serverIP = initNetwork();




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
        skipTaskbar: false, // Windows/Linux
        focusable: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, '..', 'preload.js'),
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
            preload: path.join(__dirname, '..', 'preload.js')
        }
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
let reconnecting = false;
async function createExamWindow() { 

    if (!kiosksMode){
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
        safeSend('network-online', examWindow);
            
        
    } catch {
        serverReachable = false;
        // Keep lastExamURL; overlay shows offline
        safeSend('network-offline', examWindow);
        
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
                if (!serverReachable) safeSend('network-offline', examWindow);
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
        safeSend('network-offline', examWindow);
    });

    // Retry loop every 2s with reconnection flag to prevent overlaps
    reconnectLoop(examWindow, serverReachable, lastExamURL, reconnecting);

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
function getExamWindow(){

    return examWindow;
}

function  initKiosk(windowRef) {
    examWindow = windowRef;
}


module.exports = { 
    initKiosk,
    createExamWindow,
    focusExamWindow,
    getExamWindow 
};