//examhandlers.js

const { ipcMain } = require("electron");
const path = require("path");
const {createStartWindow, getStartWindow } = require("../windows");
let serverIP = require("../services/storeServices").get('serverIP');
const { showMessage } = require("../services/modalService");
const { autoUpdater } = require("electron-updater");
const { createExamWindow, getExamWindow } = require("../kiosk");
const { checkServer } = require("../network");
let startWindow;
let examWindow = getExamWindow();

function registerExamHandlers(){

    ipcMain.on('start', () => {
   
        // Instead of a new window, just load the next file in the SAME window
        startWindow = getStartWindow();
        if (startWindow) {
            startWindow.loadFile(path.join(__dirname, "..", "..", "renderer", "login.html"));
        }
    
    });

    ipcMain.handle('exam-login', async () => {
       startWindow = getStartWindow();
        if (!startWindow) return { success: false };

        try {
            if (!examWindow) {
                await autoUpdater.checkForUpdates();
            }       
            // Check if server is reachable
            await checkServer(serverIP);

            // Close the start window and open the exam window
            
            createExamWindow();
            startWindow.close();
            return { success: true };
        } catch  {
            
            await showMessage(`cannot reach server${serverIP ? ` at ${serverIP}` : ''}`);
            return { success: false };
        }
    }); 
}

module.exports = registerExamHandlers;