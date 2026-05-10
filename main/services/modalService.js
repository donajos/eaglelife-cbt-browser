const { BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { preload } = require("../paths");


function showMessage(message) {
    return new Promise((resolve) => {

        const parent = BrowserWindow.getFocusedWindow();

        const modal = new BrowserWindow({
            width: 300,
            height: 150,
            modal: true,
            parent: parent || undefined,
            autoHideMenuBar: true,
            frame: false,
            resizable: false,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, '..', '..', 'preload.js')
            }
        });

        modal.loadFile(path.join(__dirname, "..", "..", "renderer", "showModal.html"));

        modal.webContents.on("did-finish-load", () => {
            modal.webContents.send("show-message", message);
        });

        ipcMain.once("modal-closed", () => {
            modal.close();
            resolve();
        });
    });
}

module.exports = {
    showMessage
};