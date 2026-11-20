//examhandlers.js

const { ipcMain } = require("electron");
const path = require("path");
const store = require("../services/storeServices");
const { getStartWindow } = require("../windows");
const { showMessage } = require("../services/modalService");
const { createExamWindow } = require("../kiosk");
const { checkServer } = require("../network");

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
            await checkServer(serverIP);
        } catch {
            await showMessage(`cannot reach server`);
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