const { ipcMain } = require("electron");

function registerConfigHandlers() {

    ipcMain.on("save-ip", (event, ip) => {
        // existing logic unchanged
    });

    ipcMain.handle("get-ip", () => {
        // existing logic unchanged
    });
}

module.exports = registerConfigHandlers;