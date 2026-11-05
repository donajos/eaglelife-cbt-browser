const { ipcMain } = require("electron");
const { checkForUpdates } = require("../updater");
const log = require("electron-log");

function registerUpdateLink() {
    ipcMain.handle('open-update-link', async () => {
        try {
            return await checkForUpdates();
        } catch (error) {
            log.error("Unable to check for updates:", error);
            return {
                success: false,
                error: error.message
            };
        }
    });
}


module.exports = registerUpdateLink;