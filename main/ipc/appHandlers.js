const { app, ipcMain } = require('electron');

let currentVersion = '';
if (app && typeof app.getVersion === 'function') {
    currentVersion = app.getVersion();
}

function registerAppHandlers() {
    ipcMain.handle('get-version', () => {
        return currentVersion;
    });
}

module.exports = registerAppHandlers;

