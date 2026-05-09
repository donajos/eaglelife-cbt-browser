
const { app } = require("electron");
const { initWindows, focusExamWindow  } = require("./windows");
const { initKiosk } = require("./kiosk");
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
}
