const { ipcMain } = require("electron");
const { showMessage } = require("../services/modalService");

function registerModalHandlers() {

    ipcMain.on("show-message", async (event, message) => {

        try {
            await showMessage(message);

        } catch (err) {
            console.error("Failed to show modal:", err);
        }
    });
}

module.exports = registerModalHandlers;