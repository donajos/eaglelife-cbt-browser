//windows.js

const { BrowserWindow } = require('electron');
const path = require('path');
//const registerIPC = require("./ipc");
const { PRELOAD } = require("./paths");

preload: PRELOAD


let configWindow;
let startWindow;


function getConfigWindow() {

    return configWindow;
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
exports.createStartWindow = createStartWindow;

function getStartWindow() {
    return startWindow;
}



/* function showMessage(message) {
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
} */






function initWindows() {
    createConfigWindow();
}


module.exports = {
    initWindows,
    createStartWindow,
    getConfigWindow,
    getStartWindow,
    
    //showMessage
};