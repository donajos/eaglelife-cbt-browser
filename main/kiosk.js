//kiosk.js

const { BrowserWindow, app } = require('electron');
const path = require('path');
const { checkServer, reconnectLoop, initNetwork, safeSend } = require("./network");
const store = require("./services/storeServices");
const { startKeyboardHook } = require("./services/keyboardHook");

let autoUpdater = null;
if (process.versions && process.versions.electron) {
    ({ autoUpdater } = require("electron-updater"));
}

let kioskMode = true;
let examWindow;
let serverReachable = false;
let lastExamURL = null;
let reconnecting = false;

function kiosksMode() {
    const serverIP = initNetwork();

    examWindow = new BrowserWindow({
        kiosk: true,
        fullscreen: true,
        minimizable: false,
        maximizable: true,
        frame: false,
        resizable: false,
        autoHideMenuBar: true,
        center: true,
        alwaysOnTop: true,
        skipTaskbar: true,
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

    examWindow.webContents.setWindowOpenHandler(({ url }) => {
        try {
            return (new URL(url).hostname === serverIP) ? { action: 'allow' } : { action: 'deny' };
        } catch {
            return { action: 'deny' };
        }
    });
    examWindow.webContents.on('context-menu', e => e.preventDefault());

    examWindow.webContents.on('before-input-event', (event, input) => {
        if (
            input.key === 'F12' ||
            (input.control && input.shift && input.key.toLowerCase() === 'i') ||
            (input.control && input.key.toLowerCase() === 'r') ||
            (input.control && input.key.toLowerCase() === 'w') ||
            (input.alt && input.key === 'F4') ||
            (input.meta && input.key.toLowerCase() === 'q') ||
            (input.control && input.meta && input.key.toLowerCase() === 'd') ||
            (input.meta && input.key.toLowerCase() === 'd') ||
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
        frame: true,
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

async function createExamWindow() {
    if (examWindow && !examWindow.isDestroyed()) {
        return;
    }

    const serverIP = initNetwork();

    if (!serverIP) {
        return;
    }

    if (!kioskMode) {
        noKiosksMode();
        return;
    }

    await startKeyboardHook();
    kiosksMode();

    const examURL = `http://${serverIP}/cbtexam/my/`;
    lastExamURL = lastExamURL || examURL;

    const safeLoadURL = async (url) => {
        try {
            await examWindow.loadURL(url);
        } catch {
            // Ignore load errors, overlay will handle offline
        }
    };

    try {
        await checkServer(serverIP);
        serverReachable = true;
        await safeLoadURL(lastExamURL);
        safeSend('network-online', examWindow);
    } catch {
        serverReachable = false;
        safeSend('network-offline', examWindow);
        await safeLoadURL(lastExamURL);
    }

    examWindow.webContents.on('did-navigate', (event, url, isMainFrame) => {
        if (isMainFrame) lastExamURL = url;
    });
    examWindow.webContents.on('did-navigate-in-page', (event, url) => {
        lastExamURL = url;
    });

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

    examWindow.webContents.on('will-redirect', blockExternal);
    examWindow.webContents.on('will-navigate', blockExternal);

    examWindow.webContents.on('did-fail-load', (event, errorCode, errorDesc, validatedURL, isMainFrame) => {
        console.error(`Failed to load ${validatedURL}: ${errorCode} ${errorDesc}`);
        if (!isMainFrame || errorCode === -3) return;
        serverReachable = false;
        lastExamURL = validatedURL;
        safeSend('network-offline', examWindow);
    });

    reconnectLoop(examWindow, serverReachable, lastExamURL);

    let lastFocusTime = 0;
    examWindow.on('blur', () => {
        const now = Date.now();
        if (now - lastFocusTime > 100) {
            lastFocusTime = now;
            if (examWindow && !examWindow.isDestroyed()) {
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

    examWindow.on('closed', () => {
        reconnecting = false;
        examWindow = null;

        if (!app.isQuitting) {
            setTimeout(() => {
                if (!examWindow) createExamWindow();
            }, 1000);
        }

        if (store.get('pendingUpdate') && autoUpdater) {
            autoUpdater.quitAndInstall();
        }
    });
}

function getExamWindow() {
    return examWindow;
}

function initKiosk(windowRef) {
    examWindow = windowRef;
}

module.exports = {
    initKiosk,
    createExamWindow,
    focusExamWindow,
    getExamWindow
};