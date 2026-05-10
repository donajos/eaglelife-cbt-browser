const { ipcMain } = require("electron");
const { initUpdater } = require("../updater");
const { initServerControl } = require("../serverControl");
const store = require("../services/storeServices");
const { initWindows, createStartWindow, getConfigWindow } = require("../windows");



function registerConfigHandlers() {

    ipcMain.on('save-ip', (event, ip) => {
    
    if (ip && ip.trim() !== '') {
        store.set('serverIP', ip.trim());
        serverIP = ip.trim();

        initUpdater();
        initServerControl();

        createStartWindow();
        getConfigWindow().destroy();
    }
});

ipcMain.handle('get-ip', () => {
    return store.get('serverIP');
});
}

module.exports = registerConfigHandlers;