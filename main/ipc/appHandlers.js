const { ipcMain } = require('electron');


ipcMain.handle('get-version', () => {
    return currentVersion;
});