const { ipcMain } = require("electron");
const path = require("path");
const {createStartWindow, createExamWindow} = require("../windows");
let serverIP = require("../services/storeServices").get('serverIP');
const { showMessage } = require("../services/modalService");

const { getStartWindow } = require("../windows");

function registerExamHandlers(){

    ipcMain.on('start', () => {
   
        // Instead of a new window, just load the next file in the SAME window
        const startWindow = getStartWindow();
        if (startWindow) {
            startWindow.loadFile(path.join(__dirname, "..", "..", "renderer", "login.html"));
        }
    
    });

    ipcMain.handle('exam-login', async () => {
        const startWindow = getStartWindow();
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
}

module.exports = registerExamHandlers;