//main.js
const { app } = require("electron");
const { initWindows  } = require("./windows");
const { initKiosk, focusExamWindow  } = require("./kiosk");
const registerIPC = require("./ipc");
const { initNetwork } = require("./network");
const { initUpdater } = require("./updater");
const { initServerControl, stopServerControl } = require("./serverControl");



const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
    app.quit();

} else {

    app.on("second-instance", () => {
        focusExamWindow();
    });

    app.whenReady().then(() => {

        initWindows();
        initKiosk();
        initNetwork();
        initUpdater();
        initServerControl();
        registerIPC();

    });

    app.on('window-all-closed', () => {
        stopServerControl();
        if (process.platform !== 'darwin') app.quit();
    });

    process.on('uncaughtException', (err) => {
        console.error('UNCAUGHT EXCEPTION:', err);
    });

    process.on('unhandledRejection', (reason) => {
        console.error('UNHANDLED REJECTION:', reason);
    });
}
