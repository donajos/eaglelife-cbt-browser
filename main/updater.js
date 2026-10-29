//updater.js

const store = require("./services/storeServices");
const log = require("electron-log");

let autoUpdater = null;
if (process.versions && process.versions.electron) {
    ({ autoUpdater } = require("electron-updater"));
    autoUpdater.logger = log;
    autoUpdater.logger.transports.file.level = "info";
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
}

function initUpdater() {
    if (!autoUpdater) return;

    store.set('updateChecked', false);
    let serverIP = store.get('serverIP');

    if (!serverIP) return;

    autoUpdater.setFeedURL({
        provider: "generic",
        url: `http://${serverIP}/updates/`
    });

    if (!store.get('updateChecked')) {
        autoUpdater.checkForUpdates();
        store.set('updateChecked', true);
    }
}

module.exports = { initUpdater };