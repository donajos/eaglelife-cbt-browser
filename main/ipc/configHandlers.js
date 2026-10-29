const { ipcMain } = require("electron");
const { initUpdater } = require("../updater");
const { initServerControl } = require("../serverControl");
const store = require("../services/storeServices");
const { createStartWindow, getConfigWindow } = require("../windows");

function registerConfigHandlers() {
    ipcMain.on('save-ip', (event, ip) => {
        const trimmedIp = (ip || '').trim();

        if (trimmedIp !== '') {
            store.set('serverIP', trimmedIp);

            initUpdater();
            initServerControl();

            createStartWindow();

            const configWindow = getConfigWindow();
            if (configWindow && !configWindow.isDestroyed()) {
                configWindow.destroy();
            }
        }
    });

    ipcMain.handle('get-ip', () => {
        return store.get('serverIP');
    });
}

module.exports = registerConfigHandlers;