const { app, ipcMain } = require('electron');
const { autoUpdater } = require("electron-updater");
const currentVersion = app.getVersion();

function registerAppHandlers(){

    ipcMain.handle('get-version', () => {
    return currentVersion;
});

}

module.exports = registerAppHandlers;

