//kiosk.js

let kioskMode = true; // default to kiosk mode, can be toggled
let examWindow;

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


function initKiosk(windowRef) {
    examWindow = windowRef;
}

module.exports = { initKiosk };