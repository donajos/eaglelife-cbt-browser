const axios = require("axios");
const { app } = require("electron");
const store = require("./services/storeServices");
const { getExamWindow } = require("./kiosk");

let interval;
let serverCommandInterval = null;
let kioskMode = true;
let appLock = false;

function checkServerCommands() {
    if (serverCommandInterval) return;

    serverCommandInterval = setInterval(async () => {
        const examWindow = getExamWindow();

        if (examWindow && !examWindow.isDestroyed()) return;

        const serverIP = store.get('serverIP');
        if (!serverIP) return;

        try {
            const res = await axios.get(`http://${serverIP}/updates/api/system-status.php`);

            kioskMode = !!res.data.examActive;
            appLock = !!res.data.lockClient;

            if (res.data.shutdown) {
                app.quit();
            }
        } catch (err) {
            console.log("Failed to check server version:", err.message);
        }
    }, 60000);
}

function stopServerControl() {
    if (serverCommandInterval) {
        clearInterval(serverCommandInterval);
        serverCommandInterval = null;
    }
}

function initServerControl() {
    checkServerCommands();
}

module.exports = {
    initServerControl,
    stopServerControl
};