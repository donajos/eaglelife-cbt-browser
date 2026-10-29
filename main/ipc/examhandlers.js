//examhandlers.js

const { ipcMain } = require("electron");
const path = require("path");
const store = require("../services/storeServices");
const { getStartWindow } = require("../windows");
const { showMessage } = require("../services/modalService");
const { createExamWindow, getExamWindow } = require("../kiosk");
const { checkServer } = require("../network");

let autoUpdater = null;
if (process.versions && process.versions.electron) {
    ({ autoUpdater } = require("electron-updater"));
}

let startWindow;

function registerExamHandlers() {
    ipcMain.on('start', () => {
        startWindow = getStartWindow();
        if (startWindow) {
            startWindow.loadFile(path.join(__dirname, "..", "..", "renderer", "login.html"));
        }
    });

    ipcMain.handle('exam-login', async () => {
        startWindow = getStartWindow();
        if (!startWindow) return { success: false };

        const serverIP = store.get('serverIP');

        try {
            if (!getExamWindow()) {
                await autoUpdater.checkForUpdates();
            }
            await checkServer(serverIP);
        } catch {
            await showMessage(`cannot reach server${serverIP ? ` at ${serverIP}` : ''}`);
            return { success: false };
        }

        try {
            await createExamWindow();
            startWindow.close();
            return { success: true };
        } catch (error) {
            await showMessage(`Unable to start kiosk mode: ${error.message}`);
            return { success: false };
        }
    });
}

module.exports = registerExamHandlers;